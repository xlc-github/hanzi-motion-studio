"""
Playwright 逐帧采集：打开前端构建出的 render.html，注入与预览相同的参数，
逐帧截取真实动画画面，帧数由动画完成事件驱动（非固定时长）。
"""
import asyncio
import functools
import http.server
import socketserver
import threading
import urllib.parse
from pathlib import Path
from typing import List, Optional

from playwright.async_api import async_playwright, Browser, Page

from app.core.config import BASE_DIR, HANZI_DATA_DIR
from app.models.schemas import ExportRequest

FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
RENDER_HTML = FRONTEND_DIST / "render.html"


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def _start_static_server() -> tuple[socketserver.TCPServer, int, threading.Thread]:
    """在当前进程内启动静态文件服务器托管前端 dist，返回 (server, port, thread)。"""
    handler = functools.partial(_QuietHandler, directory=str(FRONTEND_DIST))
    server = socketserver.TCPServer(("127.0.0.1", 0), handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port, thread


# 复用的静态服务器（进程级）
_static_server: Optional[tuple] = None


def _get_static_base_url() -> str:
    global _static_server
    if _static_server is None:
        _static_server = _start_static_server()
    return f"http://127.0.0.1:{_static_server[1]}"


async def _setup_page_routing(page: Page) -> None:
    """
    拦截页面请求：
    1) 字库请求从本地返回，避免依赖静态托管路径；
    2) 阻断所有外部 http/https 请求，强制离线（借鉴开源参考项目的安全实践），
       一旦渲染页意外访问 CDN 会立即失败并暴露问题，保证产品离线可用。
    """
    async def handle_hanzi(route):
        url = route.request.url
        # 从 URL 中提取字符（可能是 %xx 编码）
        raw = url.split("/hanzi/")[-1].split("?")[0]
        char = urllib.parse.unquote(raw)
        if char.endswith(".json"):
            char = char[:-5]
        data_path = HANZI_DATA_DIR / f"{char}.json"
        if data_path.exists():
            await route.fulfill(
                status=200,
                content_type="application/json; charset=utf-8",
                body=data_path.read_bytes(),
            )
        else:
            await route.fulfill(status=404, body="")

    async def block_external(route):
        # 本地静态服务器、data/blob 协议放行；其余外部请求一律阻断
        await route.abort("blockedbyclient")

    # Playwright 中后注册的路由优先匹配，因此先注册通用拦截，再注册字库专用路由。
    # 放行本地地址与内联协议，阻断其它一切（主要是 CDN）。
    await page.route("**/*", lambda route: (
        route.continue_()
        if _is_local_url(route.request.url)
        else block_external(route)
    ))
    # 字库专用路由（后注册，优先匹配）
    await page.route("**/hanzi/*", handle_hanzi)


def _is_local_url(url: str) -> bool:
    """判断是否为本地/内联资源（允许加载）。"""
    if url.startswith(("data:", "blob:", "about:")):
        return True
    # 本地静态服务器在 127.0.0.1 上，端口由 _get_static_base_url 分配
    try:
        from urllib.parse import urlparse
        host = urlparse(url).hostname
        return host in ("127.0.0.1", "localhost")
    except Exception:
        return False


def _build_url(req: ExportRequest, scale: float = 1.0) -> str:
    params = {
        "char": req.char,
        "style": req.style.model_dump_json(),
        "anim": req.anim.model_dump_json(),
        "size": req.size,
        "scale": scale,
    }
    query = urllib.parse.urlencode(params)
    return f"{_get_static_base_url()}/render.html?{query}"


async def capture_frames(
    req: ExportRequest,
    browser: Browser,
    *,
    include_animation: bool = True,
) -> List[bytes]:
    """
    采集帧序列（PNG bytes）。
    - include_animation=True：从空白开始逐笔书写，采集完整动画。
    - include_animation=False：仅采集完整字静态帧（PNG 导出用）。
    """
    context = await browser.new_context(
        viewport={"width": req.size, "height": req.size},
        device_scale_factor=1,
    )
    page = await context.new_page()
    await _setup_page_routing(page)

    # Playwright 单帧截图约需 77ms，远慢于目标帧间隔（如 30fps 的 33ms）。
    # 若按原速采集，只能采到约 1/3 的帧，再用固定 fps 编码就会导致动画被加速。
    # 解决办法：采集时把动画慢放 scale 倍，采完再按真实时间轴重采样到目标帧数。
    scale = _compute_capture_scale(req.anim.fps) if include_animation else 1.0
    url = _build_url(req, scale=scale)
    await page.goto(url, wait_until="load")

    # 等待渲染页初始化完成
    await page.wait_for_function("window.__hm && window.__hm.ready === true", timeout=30000)

    frames: List[bytes] = []

    if include_animation:
        fps = req.anim.fps

        # 首帧停顿：书写前只有浅灰轮廓，重复 N 帧
        head_frames = max(1, round(req.anim.headPause / 1000 * fps))
        first_frame = await _capture(page)

        # 启动慢放动画，逐帧采集直到动画真正完成（帧数由完成事件驱动，不写死时长）
        await page.evaluate("window.__hm.start()")
        anim_frames: List[bytes] = []
        while True:
            frame = await _capture(page)
            anim_frames.append(frame)
            done = await page.evaluate("window.__hm.isDone()")
            if done:
                break
            # 截图本身已耗时约 77ms，这里不再额外 sleep，避免过度拉长采集

        # 从渲染页读取动画在“用户设定速度”下的真实时长（不含慢放）。
        # 这是决定输出帧数的黄金依据：目标帧数 = 真实时长 × fps。
        logic_ms = await page.evaluate("window.__hm.getDurationMs()")

        # 目标帧数 = 真实书写时长 × 帧率，保证按 fps 编码后播放时长与原速一致
        target_frames = max(2, round(logic_ms / 1000 * fps))
        resampled = _resample_uniform(anim_frames, target_frames)

        frames.extend([first_frame] * head_frames)
        frames.extend(resampled)
        # 尾帧停顿：完整字保持 N 帧
        tail_frames = max(1, round(req.anim.tailPause / 1000 * fps))
        frames.extend([resampled[-1]] * tail_frames)
    else:
        await page.evaluate("window.__hm.showFull()")
        frames.append(await _capture(page))

    await context.close()
    return frames


def _compute_capture_scale(fps: int) -> float:
    """
    计算慢放系数，保证慢放后单帧截图间隔对应的逻辑时间 <= 目标帧间隔。
    截图约 77ms，乘 1.1 留余量 → scale >= 0.085 * fps。
    fps=30 → 约 3 倍；fps=60 → 约 6 倍。
    """
    import math
    return float(max(2, math.ceil(0.085 * fps)))


def _resample_uniform(frames: List[bytes], target: int) -> List[bytes]:
    """把采集到的帧按索引均匀重采样为 target 帧（不足则复用，过多则抽取）。"""
    n = len(frames)
    if n == 0:
        return []
    if target == 1:
        return [frames[0]]
    return [frames[round(i * (n - 1) / (target - 1))] for i in range(target)]


async def _capture(page: Page) -> bytes:
    """截取当前画面为 PNG bytes。"""
    stage = await page.query_selector("#stage")
    data = await stage.screenshot(omit_background=True)
    return data


# ---------------- 浏览器实例管理 ----------------
_browser: Optional[Browser] = None
_playwright = None


async def get_browser() -> Browser:
    global _browser, _playwright
    if _browser is None or not _browser.is_connected():
        _playwright = await async_playwright().start()
        _browser = await _playwright.chromium.launch(headless=True)
    return _browser


async def close_browser() -> None:
    global _browser, _playwright
    if _browser is not None:
        await _browser.close()
        _browser = None
    if _playwright is not None:
        await _playwright.stop()
        _playwright = None
