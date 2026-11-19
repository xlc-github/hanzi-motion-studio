"""
下载 hanzi-writer-data 笔画数据到本地字库目录。
同时写入前端 public/hanzi 和后端 data/hanzi，实现离线加载。

用法：
    python backend/scripts/fetch_chars.py 烧 威 武 镇 盈 彤
    python backend/scripts/fetch_chars.py --all-common   # 下载常用字（需 COMMON_CHARS 文件）
"""
import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
FRONTEND_HANZI = BASE_DIR.parent / "frontend" / "public" / "hanzi"
BACKEND_HANZI = BASE_DIR / "data" / "hanzi"
CDN = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/{char}.json"

# 预设课文生字（与前端 textUtils.PRESET_LESSONS 对应）
PRESET_CHARS = list("烧威武镇盈彤皂廊碗若透娇扯潮据堤阔盼滚顿虎操占嫩顺均叠"
                    "你我他好学习中国大小山水日月明亮")


def sanitize(chars: list[str]) -> list[str]:
    result = []
    for c in chars:
        if "\u4e00" <= c <= "\u9fff" and c not in result:
            result.append(c)
    return result


def fetch_one(char: str) -> bool:
    url = CDN.format(char=urllib.parse.quote(char))
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "HanziMotionStudio/1.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if not data.get("strokes"):
            return False
        for target in (FRONTEND_HANZI, BACKEND_HANZI):
            target.mkdir(parents=True, exist_ok=True)
            (target / f"{char}.json").write_text(
                json.dumps(data, ensure_ascii=False), encoding="utf-8"
            )
        return True
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ {char}: {e}")
        return False


def main():
    args = sys.argv[1:]
    chars = sanitize(args) if args else sanitize(PRESET_CHARS)
    print(f"准备下载 {len(chars)} 个汉字的笔画数据...")
    ok = 0
    for c in chars:
        exists = (FRONTEND_HANZI / f"{c}.json").exists() and (BACKEND_HANZI / f"{c}.json").exists()
        if exists:
            print(f"  • {c}: 已存在，跳过")
            ok += 1
            continue
        if fetch_one(c):
            print(f"  ✓ {c}")
            ok += 1
    print(f"\n完成：{ok}/{len(chars)} 成功")
    print(f"前端字库：{FRONTEND_HANZI}")
    print(f"后端字库：{BACKEND_HANZI}")


if __name__ == "__main__":
    main()
