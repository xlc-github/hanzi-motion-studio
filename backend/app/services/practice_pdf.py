"""
练习页 PDF 渲染：把前端渲染好的 A4 练习页 SVG 转成 PDF。

设计要点：
- SVG 是唯一真相源（frontent XMLSerializer 输出），PDF 与屏幕预览完全一致，
  后端不重复实现练习页布局逻辑。
- 复用全局 Chromium 实例，用 page.pdf() 输出矢量 A4，中文字体由系统
  Microsoft YaHei 嵌入（headless Chromium 已验证）。
- 阻断一切外部网络请求，保持离线安全。
"""
import re
from pathlib import Path

from playwright.async_api import Browser

_SVG_OPEN = re.compile(r"<svg\b", re.IGNORECASE)


def _wrap_svg_html(svg: str) -> str:
    """把裸 SVG 包装成铺满 A4 的打印页。

    @page 零边距 + svg 显式 210mm×297mm，保证 PDF 与 SVG viewBox(794×1123) 一一对应。
    """
    # XMLSerializer 输出通常自带 xmlns；若缺失则补上，避免浏览器解析为 HTML 未知元素
    if "xmlns=" not in svg[:200]:
        svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"', 1)
    return (
        "<!doctype html><html><head><meta charset='utf-8'><style>"
        "@page{size:A4;margin:0}"
        "html,body{margin:0;padding:0;width:210mm;height:297mm;overflow:hidden}"
        "svg{display:block;width:210mm;height:297mm}"
        "</style></head><body>" + svg + "</body></html>"
    )


async def render_practice_pdf(svg: str, output: Path, browser: Browser) -> None:
    """将练习页 SVG 渲染成 A4 PDF，写入 output（原子写入由调用方处理）。

    抛出 ValueError：SVG 内容为空或不含 <svg> 标签。
    """
    if not svg or not _SVG_OPEN.search(svg):
        raise ValueError("练习页 SVG 内容为空或格式不正确")

    page = await browser.new_page(viewport={"width": 794, "height": 1123})
    try:
        # 阻断外部请求，保持离线（data/blob 协议放行）
        async def block_external(route):
            url = route.request.url
            if url.startswith(("data:", "blob:", "about:")):
                await route.continue_()
            else:
                await route.abort("blockedbyclient")

        await page.route("**/*", block_external)
        await page.set_content(_wrap_svg_html(svg), wait_until="load")
        await page.pdf(
            path=str(output),
            format="A4",
            print_background=True,
            margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
        )
    finally:
        await page.close()
