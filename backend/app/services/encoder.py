"""FFmpeg 编码器：帧序列 → GIF / MP4；以及 PNG / SVG 导出。"""
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from app.core.config import EXPORT_DIR
from app.models.schemas import ExportRequest


def _ffmpeg() -> str:
    p = shutil.which("ffmpeg")
    if not p:
        raise RuntimeError("未找到 FFmpeg，请先安装并加入 PATH")
    return p


def _write_frames(frames: list[bytes], tmpdir: Path) -> None:
    for i, frame in enumerate(frames):
        (tmpdir / f"frame_{i:05d}.png").write_bytes(frame)


def encode_gif(frames: list[bytes], fps: int, loop_count: int, output: Path) -> Path:
    """用 palettegen/paletteuse 编码高质量 GIF。"""
    with tempfile.TemporaryDirectory() as td:
        tmpdir = Path(td)
        _write_frames(frames, tmpdir)
        # -loop 0 = 无限循环；loop_count>0 时用 -loop 无效，GIF 的循环次数由 Netscape 扩展控制，简单起见 0=无限，1=播放一次
        loop = 0 if loop_count == 0 else 1
        cmd = [
            _ffmpeg(), "-y", "-framerate", str(fps),
            "-i", str(tmpdir / "frame_%05d.png"),
            "-filter_complex",
            "[0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer",
            "-loop", str(loop),
            str(output),
        ]
        _run(cmd)
    return output


def encode_mp4(frames: list[bytes], fps: int, output: Path) -> Path:
    """H.264 / yuv420p 编码，兼容 PPT / WPS。时长由帧数决定，不截断。"""
    with tempfile.TemporaryDirectory() as td:
        tmpdir = Path(td)
        _write_frames(frames, tmpdir)
        cmd = [
            _ffmpeg(), "-y", "-framerate", str(fps),
            "-i", str(tmpdir / "frame_%05d.png"),
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-crf", "20", "-preset", "medium",
            "-movflags", "+faststart",
            str(output),
        ]
        _run(cmd)
    return output


def save_png(frame: bytes, output: Path) -> Path:
    output.write_bytes(frame)
    return output


def export_svg(req: ExportRequest, char_data: dict, output: Path) -> Path:
    """
    生成真实矢量 SVG：使用原始 stroke path，按 medians 计算 stroke-dasharray 实现逐笔绘制。
    输出为静态完整字形（矢量、无限放大清晰）。
    """
    size = req.size
    strokes = char_data.get("strokes", [])
    medians = char_data.get("medians", [])
    color = req.style.strokeColor

    paths = []
    for i, d in enumerate(strokes):
        dash = ""
        if i < len(medians):
            length = _median_length(medians[i])
            dash = f' stroke-dasharray="{length:.2f}" stroke-dashoffset="0"'
        paths.append(
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round"{dash}/>'
        )

    # Hanzi Writer 数据坐标系为 0..1024，缩放到目标尺寸
    scale = size / 1024.0
    bg = "" if req.style.transparent else f'<rect width="{size}" height="{size}" fill="{req.style.background}"/>'
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 1024 1024">{bg}'
        f'<g transform="scale({scale})">{"".join(paths)}</g></svg>'
    )
    output.write_text(svg, encoding="utf-8")
    return output


def _median_length(median: list) -> float:
    total = 0.0
    for i in range(1, len(median)):
        x1, y1 = median[i - 1]
        x2, y2 = median[i]
        total += ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
    return total


def _run(cmd: list[str]) -> None:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg 编码失败: {result.stderr[-800:]}")
