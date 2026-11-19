"""
笔画分解图：基于真实 strokes 数据生成逐步书写图 + 总览图。
- 每一步：前 n 笔用笔画色实心，其余笔画用轮廓色（浅灰）。
- 总览：所有步骤按网格拼成一张图，便于备课打印。
- 输出 SVG（矢量）或 PNG（Playwright 渲染 SVG 截图）。
"""
import base64
from pathlib import Path
from typing import Callable

from app.core.config import EXPORT_DIR
from app.models.schemas import DecomposeRequest
from app.services.render_capture import get_browser


def _grid_svg(style, size: int) -> str:
    """生成练字格 SVG 片段（坐标系 0..1024）。"""
    if style.grid == "none":
        return ""
    c = style.gridColor
    # 视觉线宽：配置是相对 512 的 px，换算到 1024 坐标系
    w = style.gridLineWidth * 2
    dash = f'stroke-dasharray="{1024 * 0.02} {1024 * 0.02}"'
    s = f'<rect x="2" y="2" width="1020" height="1020" fill="none" stroke="{c}" stroke-width="{w}"/>'
    s += f'<line x1="2" y1="512" x2="1022" y2="512" stroke="{c}" stroke-width="{w}" {dash}/>'
    s += f'<line x1="512" y1="2" x2="512" y2="1022" stroke="{c}" stroke-width="{w}" {dash}/>'
    if style.grid == "mi":
        s += f'<line x1="2" y1="2" x2="1022" y2="1022" stroke="{c}" stroke-width="{w}" {dash}/>'
        s += f'<line x1="1022" y1="2" x2="2" y2="1022" stroke="{c}" stroke-width="{w}" {dash}/>'
    return s


def _stroke_number_badge(
    medians: list, index: int, style, scale: float, t: float, ty: float, color: str
) -> str:
    """在当前笔起点画序号圆圈（实心底 + 白字）。

    坐标独立于字形 transform：字库 (mx,my) 经 translate/scale 变换后的
    SVG 坐标为 (t + mx*scale, ty - my*scale)。序号元素放在字形 <g> 之外，
    避免被 scale(s,-s) 的 Y 轴翻转导致文字倒置。
    """
    try:
        pt = medians[index][0]
        mx, my = float(pt[0]), float(pt[1])
    except (IndexError, KeyError, TypeError, ValueError):
        return ""
    cx = t + mx * scale
    cy = ty - my * scale
    r = 38
    # 约束在画布内，避免圆圈被裁切
    cx = max(r + 4, min(1024 - r - 4, cx))
    cy = max(r + 4, min(1024 - r - 4, cy))
    return (
        f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="{color}" '
        f'stroke="#FFFFFF" stroke-width="3"/>'
        f'<text x="{cx:.1f}" y="{cy:.1f}" text-anchor="middle" dominant-baseline="central" '
        f'font-family="Arial, sans-serif" font-size="{int(r * 1.15)}" font-weight="bold" '
        f'fill="#FFFFFF">{index + 1}</text>'
    )


def _step_svg(strokes: list[str], medians: list, style, size: int, upto: int) -> str:
    """生成一步的 SVG。

    - 已写笔（前 upto-1 笔）：笔画色
    - 当前笔（第 upto 笔）：强调色（若开启 emphasizeDecomposeStroke），否则笔画色
    - 未写笔：轮廓色
    - 序号：当前笔起点画红圈白字序号（若开启 showStrokeNumbers 且有 medians）
    """
    scale = style.glyphScale
    # 字库 (Make Me A Hanzi) 坐标系：x 0→1024, y -124→900，Y 轴向上；
    # SVG 的 Y 轴向下，因此对 Y 使用负缩放做翻转（与 Hanzi Writer 官方
    # HanziWriterRenderer 的 transform 一致：translate(...) scale(s, -s)）。
    # 将字库顶部 y=900 映射到画布顶部留白 t，使字形居中且不上下颠倒。
    t = (1 - scale) * 512
    ty = 900 * scale + t
    bg = "" if style.transparent else f'<rect width="1024" height="1024" fill="{style.background}"/>'
    emphasize = getattr(style, "emphasizeDecomposeStroke", True)
    show_numbers = getattr(style, "showStrokeNumbers", True)
    paths = []
    for i, d in enumerate(strokes):
        if i < upto - 1:
            color = style.strokeColor
        elif i == upto - 1:
            color = style.highlightColor if emphasize else style.strokeColor
        else:
            color = style.outlineColor
        paths.append(f'<path d="{d}" fill="{color}"/>')
    grid = _grid_svg(style, size)
    badge = ""
    if show_numbers and medians and upto - 1 < len(medians):
        badge = _stroke_number_badge(medians, upto - 1, style, scale, t, ty, style.strokeColor)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 1024 1024">'
        f'{bg}{grid}<g transform="translate({t:.2f},{ty:.2f}) scale({scale},{-scale})">{"".join(paths)}</g>'
        f'{badge}</svg>'
    )


def _overview_svg(steps: list[str], cols: int, cell: int, label_size: int = 22) -> str:
    """把步骤 SVG 拼成网格总览（内嵌 <svg> + 步骤序号）。"""
    n = len(steps)
    rows = (n + cols - 1) // cols
    w = cols * cell
    h = rows * (cell + label_size)
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">',
             f'<rect width="{w}" height="{h}" fill="#FFFFFF"/>']
    for i, step in enumerate(steps):
        col, row = i % cols, i // cols
        x, y = col * cell, row * (cell + label_size)
        # 内嵌步骤 SVG（去掉其 xmlns 以免重复声明）
        inner = step.replace(' xmlns="http://www.w3.org/2000/svg"', '', 1)
        parts.append(
            f'<svg x="{x}" y="{y}" width="{cell}" height="{cell}" viewBox="0 0 {cell} {cell}">{inner}</svg>'
        )
        parts.append(
            f'<text x="{x + cell / 2}" y="{y + cell + label_size - 5}" text-anchor="middle" '
            f'font-family="sans-serif" font-size="{label_size - 5}" fill="#333">第{i + 1}步</text>'
        )
    parts.append('</svg>')
    return "".join(parts)


async def _svg_to_png(svg: str, width: int, height: int, output: Path, browser) -> None:
    """用 Playwright 把 SVG 渲染为透明背景 PNG。"""
    page = await browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
    try:
        await page.set_content(f'<html><body style="margin:0">{svg}</body></html>', wait_until="load")
        await page.locator("svg").first.screenshot(path=str(output), omit_background=True)
    finally:
        await page.close()


async def build_decompose_bundle(
    req: DecomposeRequest,
    char_data: dict,
    progress: Callable[[int], None] | None = None,
) -> list[Path]:
    """生成分解图文件列表（步骤图 + overview），调用方负责打包与清理。"""
    strokes = char_data.get("strokes", [])
    if not strokes:
        raise ValueError("该字没有笔画数据")
    medians = char_data.get("medians", [])
    total = len(strokes)
    size = req.size
    fmt = req.image_format

    step_svgs = [_step_svg(strokes, medians, req.style, size, i + 1) for i in range(total)]
    overview = _overview_svg(step_svgs, cols=5, cell=size)

    outputs: list[Path] = []
    if fmt == "svg":
        for i, svg in enumerate(step_svgs):
            p = EXPORT_DIR / f"step_{req.char}_{i + 1:02d}.svg"
            p.write_text(svg, encoding="utf-8")
            outputs.append(p)
            if progress:
                progress(10 + round((i + 1) / total * 70))
        ov = EXPORT_DIR / f"overview_{req.char}.svg"
        ov.write_text(overview, encoding="utf-8")
        outputs.append(ov)
    else:
        browser = await get_browser()
        for i, svg in enumerate(step_svgs):
            p = EXPORT_DIR / f"step_{req.char}_{i + 1:02d}.png"
            await _svg_to_png(svg, size, size, p, browser)
            outputs.append(p)
            if progress:
                progress(10 + round((i + 1) / total * 70))
        ov_cols = 5
        ov_rows = (total + ov_cols - 1) // ov_cols
        ov = EXPORT_DIR / f"overview_{req.char}.png"
        await _svg_to_png(overview, ov_cols * size, ov_rows * (size + 22), ov, browser)
        outputs.append(ov)

    if progress:
        progress(88)
    return outputs
