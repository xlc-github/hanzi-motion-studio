"""导出任务管理：并发限制、进度跟踪、失败重试。"""
import asyncio
import uuid
from typing import Any, Awaitable, Callable

from app.core.config import MAX_CONCURRENCY

_tasks: dict[str, dict[str, Any]] = {}
_semaphore: asyncio.Semaphore | None = None


def _get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
    return _semaphore


def create_task(meta: dict[str, Any]) -> str:
    task_id = uuid.uuid4().hex[:12]
    _tasks[task_id] = {
        "id": task_id,
        "status": "pending",
        "progress": 0,
        "error": None,
        "downloadUrl": None,
        "meta": meta,
    }
    return task_id


def get_task(task_id: str) -> dict[str, Any] | None:
    return _tasks.get(task_id)


def list_tasks() -> list[dict[str, Any]]:
    return list(_tasks.values())


async def run_task(task_id: str, coro_factory: Callable[[str], Awaitable[str]]) -> None:
    """在信号量约束下执行任务。coro_factory 返回下载 URL。"""
    task = _tasks[task_id]
    async with _get_semaphore():
        try:
            task["status"] = "running"
            task["progress"] = 10
            url = await coro_factory(task_id)
            task["downloadUrl"] = url
            task["progress"] = 100
            task["status"] = "done"
        except Exception as e:  # noqa: BLE001
            task["status"] = "failed"
            task["error"] = str(e)
