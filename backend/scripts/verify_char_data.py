"""
字库完整性校验：检查本地笔画数据的结构与一致性。

校验内容：
- 每个 JSON 含 strokes / medians / radStrokes 字段
- strokes 与 medians 数量一致（每笔都有轨迹）
- radStrokes 索引不越界
- stroke path 非空、medians 至少 2 个点
- 报告总数、总笔画数、异常项

运行：
    python backend/scripts/verify_char_data.py
退出码：0=全部通过；1=发现异常。
"""
import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
DATA_DIRS = [
    BASE / "data" / "hanzi",
    BASE.parent / "frontend" / "public" / "hanzi",
]


def verify_one(path: Path) -> list[str]:
    """校验单个字库文件，返回错误列表。"""
    errors: list[str] = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        return [f"{path.name}: JSON 解析失败 {exc}"]

    strokes = data.get("strokes")
    medians = data.get("medians")
    rad = data.get("radStrokes")

    if not isinstance(strokes, list) or not strokes:
        errors.append(f"{path.name}: strokes 缺失或为空")
        return errors
    if not isinstance(medians, list):
        errors.append(f"{path.name}: medians 缺失")
        return errors
    if len(strokes) != len(medians):
        errors.append(f"{path.name}: strokes({len(strokes)}) != medians({len(medians)})")

    for i, d in enumerate(strokes):
        if not isinstance(d, str) or not d.strip():
            errors.append(f"{path.name}: 第{i}笔 path 为空")

    for i, m in enumerate(medians):
        if not isinstance(m, list) or len(m) < 2:
            errors.append(f"{path.name}: 第{i}笔 medians 点数不足")

    if rad is not None:
        if not isinstance(rad, list):
            errors.append(f"{path.name}: radStrokes 类型错误")
        else:
            for idx in rad:
                if not isinstance(idx, int) or idx < 0 or idx >= len(strokes):
                    errors.append(f"{path.name}: radStrokes 索引越界 {idx}")
    return errors


def main() -> int:
    all_errors: list[str] = []
    total_reports = []
    for data_dir in DATA_DIRS:
        if not data_dir.exists():
            print(f"[跳过] 目录不存在: {data_dir}")
            continue
        files = sorted(data_dir.glob("*.json"))
        stroke_total = 0
        for f in files:
            errs = verify_one(f)
            all_errors.extend(errs)
            try:
                stroke_total += len(json.loads(f.read_text(encoding="utf-8")).get("strokes", []))
            except Exception:  # noqa: BLE001
                pass
        total_reports.append((data_dir, len(files), stroke_total))

    print("=== 字库完整性校验 ===")
    for data_dir, count, strokes in total_reports:
        print(f"  {data_dir.relative_to(BASE.parent) if BASE.parent in data_dir.parents else data_dir}: "
              f"{count} 字, {strokes} 笔")

    if all_errors:
        print(f"\n[失败] 发现 {len(all_errors)} 处异常:")
        for e in all_errors[:30]:
            print(f"  - {e}")
        if len(all_errors) > 30:
            print(f"  ... 另有 {len(all_errors) - 30} 处")
        return 1

    print("\n[通过] 所有字库结构完整、数据一致")
    return 0


if __name__ == "__main__":
    sys.exit(main())
