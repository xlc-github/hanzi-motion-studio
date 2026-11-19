"""全局配置。"""
from pathlib import Path

# 项目根目录（backend/）
BASE_DIR = Path(__file__).resolve().parents[2]

# 字库目录（与前端 public/hanzi 保持同步）
HANZI_DATA_DIR = BASE_DIR / "data" / "hanzi"

# 导出产物目录
EXPORT_DIR = BASE_DIR / "storage" / "exports"

# SQLite 数据库
DB_PATH = BASE_DIR / "storage" / "hanzi_studio.db"

# 批量导出并发数
MAX_CONCURRENCY = 2

# 允许的画布尺寸
ALLOWED_SIZES = {256, 512, 1024}

# 导出相关超时（秒）
EXPORT_TIMEOUT = 120

for d in (HANZI_DATA_DIR, EXPORT_DIR, DB_PATH.parent):
    d.mkdir(parents=True, exist_ok=True)
