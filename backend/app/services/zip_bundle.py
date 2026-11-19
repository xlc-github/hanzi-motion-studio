"""ZIP 打包工具：把多个导出文件合并成一个可下载的 ZIP。"""
import zipfile
from pathlib import Path

from app.core.config import EXPORT_DIR


def build_zip(files: list[Path], bundle_name: str) -> Path:
    """
    将 files 打包为 EXPORT_DIR/bundle_name（须以 .zip 结尾），返回 zip 路径。
    使用原子写入：先写临时 .zip，成功后 rename，避免损坏文件被下载。
    """
    if not bundle_name.endswith(".zip"):
        bundle_name += ".zip"
    output = EXPORT_DIR / bundle_name
    tmp = EXPORT_DIR / ("." + bundle_name)
    try:
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in files:
                if f.exists():
                    # arcname 用文件名，避免把绝对路径写进压缩包
                    zf.write(f, arcname=f.name)
        tmp.replace(output)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass
    return output
