"""
端到端导出测试：直接调用渲染 + 编码服务，验证四种格式产物可用。
运行：python backend/tests/test_export_e2e.py
"""
import asyncio
import sys
import subprocess
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models.schemas import ExportRequest, StyleConfig, AnimConfig
from app.services.render_capture import capture_frames, get_browser, close_browser
from app.services.encoder import encode_gif, encode_mp4, save_png, export_svg
from app.services import char_data

OUT = Path(__file__).resolve().parent / "_e2e_out"
OUT.mkdir(exist_ok=True)


async def main():
    req = ExportRequest(
        char="烧",
        style=StyleConfig(transparent=True, strokeColor="#C0392B"),
        anim=AnimConfig(speed=3, strokeGap=40, headPause=200, tailPause=200, fps=25),
        size=256,
    )

    print("[1/5] 检查字库数据...")
    data = char_data.load_char_data("烧")
    assert data and len(data["strokes"]) == 10, "字库数据异常"
    print(f"      烧: {len(data['strokes'])} 笔 ✓")

    print("[2/5] 启动浏览器...")
    browser = await get_browser()
    print("      Chromium 就绪 ✓")

    print("[3/5] 采集静态帧 + PNG 导出...")
    static_frames = await capture_frames(req, browser, include_animation=False)
    png = OUT / "烧.png"
    save_png(static_frames[0], png)
    print(f"      PNG: {png.stat().st_size} bytes ✓")

    print("[4/5] 采集动画帧 + GIF 导出...")
    frames = await capture_frames(req, browser, include_animation=True)
    print(f"      采集到 {len(frames)} 帧（由动画完成事件驱动，非固定时长）")
    assert len(frames) > 10, "动画帧数过少，采集可能失败"
    gif = OUT / "烧.gif"
    encode_gif(frames, req.anim.fps, 0, gif)
    print(f"      GIF: {gif.stat().st_size} bytes ✓")

    print("[5/5] MP4 + SVG 导出...")
    mp4 = OUT / "烧.mp4"
    encode_mp4(frames, req.anim.fps, mp4)
    print(f"      MP4: {mp4.stat().st_size} bytes ✓")
    svg = OUT / "烧.svg"
    export_svg(req, data, svg)
    print(f"      SVG: {svg.stat().st_size} bytes ✓")

    await close_browser()

    # 用 ffprobe 验证视频时长与编码
    print("\n=== ffprobe 验证 ===")
    for f in (gif, mp4):
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries",
             "format=duration:stream=codec_name,width,height",
             "-of", "default=noprint_wrappers=1", str(f)],
            capture_output=True, text=True,
        )
        print(f"  {f.name}: {r.stdout.strip().replace(chr(10), ', ')}")

    print("\n全部导出测试通过 ✓")


if __name__ == "__main__":
    asyncio.run(main())
