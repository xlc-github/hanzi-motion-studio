"""汉字笔画数据服务。"""
import json
from pathlib import Path
from typing import Optional

from app.core.config import HANZI_DATA_DIR

# 内存缓存
_cache: dict[str, dict] = {}


def _data_path(char: str) -> Path:
    return HANZI_DATA_DIR / f"{char}.json"


def load_char_data(char: str) -> Optional[dict]:
    """读取单字笔画数据，不存在返回 None。"""
    if char in _cache:
        return _cache[char]
    path = _data_path(char)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        _cache[char] = data
        return data
    except (json.JSONDecodeError, OSError):
        return None


def char_available(char: str) -> bool:
    return load_char_data(char) is not None


def stroke_count(char: str) -> int:
    data = load_char_data(char)
    if not data:
        return 0
    return len(data.get("strokes", []))


def available_chars() -> list[str]:
    """返回本地字库包含的所有汉字。"""
    return sorted(p.stem for p in HANZI_DATA_DIR.glob("*.json") if p.stem)
