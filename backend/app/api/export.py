"""导出 API。"""
import asyncio
import json
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.config import EXPORT_DIR
from app.db.database import db
from app.models.schemas import ExportRequest, BatchExportRequest, BundleExportRequest, DecomposeRequest, PracticePdfRequest
from app.services import char_data, task_manager
from app.services.encoder import encode_gif, encode_mp4, export_svg, save_png
from app.services.render_capture import capture_frames, get_browser
from app.services.decompose import build_decompose_bundle
from app.services.practice_pdf import render_practice_pdf
from app.services.zip_bundle import build_zip

router = APIRouter(prefix="/api/export", tags=["export"])


async def _render_file(fmt: str, req: ExportRequest, task=None) -> Path:
    """把单个字渲染成文件（原子写入），返回最终文件路径。"""
    if task:
        task["progress"] = 20

    filename = f"{req.char}_{fmt}_{uuid.uuid4().hex[:8]}.{fmt}"
    output = EXPORT_DIR / filename
    # 原子写入：先编码到临时文件，成功后再 rename。
    # FFmpeg 依赖扩展名判断格式，临时文件必须保留正确后缀（只加点前缀）。
    tmp = EXPORT_DIR / ("." + filename)
    try:
        if fmt == "png":
            browser = await get_browser()
            frames = await capture_frames(req, browser, include_animation=False)
            save_png(frames[0], tmp)
        elif fmt == "gif":
            browser = await get_browser()
            frames = await capture_frames(req, browser, include_animation=True)
            if task:
                task["progress"] = 70
            encode_gif(frames, req.anim.fps, req.loopCount, tmp)
        elif fmt == "mp4":
            browser = await get_browser()
            frames = await capture_frames(req, browser, include_animation=True)
            if task:
                task["progress"] = 70
            encode_mp4(frames, req.anim.fps, tmp)
        elif fmt == "svg":
            data = char_data.load_char_data(req.char)
            if not data:
                raise ValueError(f"「{req.char}」没有笔画数据")
            export_svg(req, data, tmp)
        else:
            raise ValueError(f"不支持的格式: {fmt}")
        tmp.replace(output)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass
    return output


def _record_history(chars: list[str], fmt: str, params_json: str, output: Path) -> None:
    try:
        with db() as conn:
            conn.execute(
                "INSERT INTO export_records(chars, format, params_json, output_path, status) VALUES (?,?,?,?,?)",
                (json.dumps(chars, ensure_ascii=False), fmt, params_json, str(output), "done"),
            )
    except Exception:
        pass  # 历史写入失败不影响导出结果


def _download_url(output: Path) -> str:
    return f"/api/export/download/{output.name}"


async def _do_export(task_id: str, fmt: str, req: ExportRequest) -> str:
    task = task_manager.get_task(task_id)
    output = await _render_file(fmt, req, task)
    _record_history([req.char], fmt, req.model_dump_json(), output)
    return _download_url(output)


async def _create_export(fmt: str, req: ExportRequest):
    if not char_data.char_available(req.char):
        raise HTTPException(status_code=404, detail=f"「{req.char}」没有笔画数据")
    if req.size <= 0 or req.size > 2048:
        raise HTTPException(status_code=400, detail="画布尺寸需在 1-2048 之间")
    task_id = task_manager.create_task({"format": fmt, "char": req.char})
    asyncio.create_task(task_manager.run_task(task_id, lambda tid: _do_export(tid, fmt, req)))
    return {"taskId": task_id}


@router.post("/gif")
async def export_gif(req: ExportRequest):
    return await _create_export("gif", req)


@router.post("/mp4")
async def export_mp4(req: ExportRequest):
    return await _create_export("mp4", req)


@router.post("/png")
async def export_png(req: ExportRequest):
    return await _create_export("png", req)


@router.post("/svg")
async def export_svg_route(req: ExportRequest):
    return await _create_export("svg", req)


@router.get("/tasks")
def list_tasks():
    return {"tasks": task_manager.list_tasks()}


@router.get("/tasks/{task_id}")
def get_task(task_id: str):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@router.post("/batch")
async def batch_export(req: BatchExportRequest):
    """批量导出：为每个字创建独立任务，返回任务 ID 列表（逐字下载）。"""
    available = [c for c in req.chars if char_data.char_available(c)]
    if not available:
        raise HTTPException(status_code=400, detail="没有可导出的有效汉字")
    ids = []
    for char in available:
        single = ExportRequest(
            char=char, style=req.style, anim=req.anim,
            size=req.size, loopCount=req.loopCount,
        )
        tid = task_manager.create_task({"format": req.format, "char": char})
        asyncio.create_task(
            task_manager.run_task(tid, lambda t, r=single, f=req.format: _do_export(t, f, r))
        )
        ids.append(tid)
    return {"taskIds": ids, "count": len(ids)}


async def _do_bundle(task_id: str, req: BundleExportRequest) -> str:
    """批量导出并打包：所有字导出完成后合并为一个 ZIP。"""
    task = task_manager.get_task(task_id)
    chars = [c for c in req.chars if char_data.char_available(c)]
    if not chars:
        raise ValueError("没有可导出的有效汉字")

    files: list[Path] = []
    total = len(chars)
    for i, char in enumerate(chars):
        single = ExportRequest(
            char=char, style=req.style, anim=req.anim,
            size=req.size, loopCount=req.loopCount,
        )
        # bundle 内部渲染不传 task（避免覆盖 bundle 自身进度），统一由循环更新
        out = await _render_file(req.format, single, task=None)
        files.append(out)
        if task:
            task["progress"] = round((i + 1) / total * 90)

    if task:
        task["progress"] = 92
    zip_name = f"batch_{req.format}_{uuid.uuid4().hex[:8]}.zip"
    zip_path = build_zip(files, zip_name)

    # ZIP 产物写入历史；单字中间文件删除，避免堆积
    _record_history(chars, f"zip:{req.format}", req.model_dump_json(), zip_path)
    for f in files:
        try:
            f.unlink()
        except OSError:
            pass
    if task:
        task["progress"] = 100
    return _download_url(zip_path)


@router.post("/bundle")
async def bundle_export(req: BundleExportRequest):
    """批量导出并打包下载（浏览器一次下载一个 ZIP）。"""
    available = [c for c in req.chars if char_data.char_available(c)]
    if not available:
        raise HTTPException(status_code=400, detail="没有可导出的有效汉字")
    if req.size <= 0 or req.size > 2048:
        raise HTTPException(status_code=400, detail="画布尺寸需在 1-2048 之间")
    task_id = task_manager.create_task({"format": f"zip:{req.format}", "chars": available})
    asyncio.create_task(task_manager.run_task(task_id, lambda tid: _do_bundle(tid, req)))
    return {"taskId": task_id}


async def _do_decompose(task_id: str, req: DecomposeRequest) -> str:
    """分解图打包导出。"""
    task = task_manager.get_task(task_id)
    if not char_data.char_available(req.char):
        raise ValueError(f"「{req.char}」没有笔画数据")
    data = char_data.load_char_data(req.char)
    if not data:
        raise ValueError(f"「{req.char}」没有笔画数据")

    def progress(p: int):
        if task:
            task["progress"] = p

    files = await build_decompose_bundle(req, data, progress)
    zip_name = f"decompose_{req.char}_{req.image_format}_{uuid.uuid4().hex[:8]}.zip"
    zip_path = build_zip(files, zip_name)
    _record_history([req.char], f"decompose:{req.image_format}", req.model_dump_json(), zip_path)
    for f in files:
        try:
            f.unlink()
        except OSError:
            pass
    if task:
        task["progress"] = 100
    return _download_url(zip_path)


@router.post("/decompose")
async def decompose_export(req: DecomposeRequest):
    """笔画分解图：逐步书写图 + 总览，打包 ZIP。"""
    if req.size <= 0 or req.size > 2048:
        raise HTTPException(status_code=400, detail="画布尺寸需在 1-2048 之间")
    task_id = task_manager.create_task({"format": f"decompose:{req.image_format}", "char": req.char})
    asyncio.create_task(task_manager.run_task(task_id, lambda tid: _do_decompose(tid, req)))
    return {"taskId": task_id}


async def _do_practice_pdf(task_id: str, req: PracticePdfRequest) -> str:
    """练习页 PDF：把前端渲染的 SVG 转成 A4 PDF。"""
    task = task_manager.get_task(task_id)
    if task:
        task["progress"] = 30

    filename = f"practice_{req.char}_{uuid.uuid4().hex[:8]}.pdf"
    output = EXPORT_DIR / filename
    tmp = EXPORT_DIR / (".practice_" + uuid.uuid4().hex[:8] + ".pdf")
    try:
        browser = await get_browser()
        if task:
            task["progress"] = 60
        await render_practice_pdf(req.svg, tmp, browser)
        if task:
            task["progress"] = 90
        tmp.replace(output)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass

    _record_history([req.char], "practice-pdf", f'{{"char":"{req.char}"}}', output)
    if task:
        task["progress"] = 100
    return _download_url(output)


@router.post("/practice-pdf")
async def practice_pdf_export(req: PracticePdfRequest):
    """练习页：将已渲染的 A4 练习页 SVG 转成 PDF（矢量、可打印）。"""
    if not req.svg or "<svg" not in req.svg.lower():
        raise HTTPException(status_code=400, detail="练习页 SVG 内容为空或格式不正确")
    task_id = task_manager.create_task({"format": "practice-pdf", "char": req.char})
    asyncio.create_task(task_manager.run_task(task_id, lambda tid: _do_practice_pdf(tid, req)))
    return {"taskId": task_id}


@router.get("/download/{filename}")
def download(filename: str):
    path = EXPORT_DIR / filename
    if not path.exists() or ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(path, filename=filename)
