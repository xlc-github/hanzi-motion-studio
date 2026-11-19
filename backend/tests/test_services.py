"""后端服务单元测试。运行：python -m pytest backend/tests/test_services.py -q"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import char_data
from app.services.encoder import _median_length, export_svg
from app.services.decompose import _step_svg
from app.models.schemas import ExportRequest, StyleConfig


def test_char_data_available():
    assert char_data.char_available("烧") is True
    assert char_data.char_available("龘") is False


def test_char_data_stroke_count():
    assert char_data.stroke_count("烧") == 10
    assert char_data.stroke_count("武") == 8


def test_char_data_structure():
    data = char_data.load_char_data("烧")
    assert data is not None
    assert len(data["strokes"]) == len(data["medians"]) == 10
    assert data["strokes"][0].startswith("M")


def test_available_chars_count():
    assert len(char_data.available_chars()) >= 40


def test_median_length():
    assert _median_length([[0, 0], [3, 4]]) == 5.0
    assert _median_length([[0, 0]]) == 0.0


def test_export_svg():
    import tempfile
    req = ExportRequest(char="烧", size=512, style=StyleConfig(transparent=True))
    data = char_data.load_char_data("烧")
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "烧.svg"
        export_svg(req, data, out)
        text = out.read_text(encoding="utf-8")
        assert "<svg" in text
        assert text.count("<path") == 10
        assert 'width="512"' in text


def test_decompose_current_stroke_emphasis_and_number():
    """分解图：当前笔用强调色、序号圆圈标注第 N 笔。"""
    data = char_data.load_char_data("水")
    strokes, medians = data["strokes"], data["medians"]
    style = StyleConfig(
        emphasizeDecomposeStroke=True,
        showStrokeNumbers=True,
        highlightColor="#E8A33D",
        strokeColor="#C0392B",
    )
    # 第 2 步：第 0 笔已写(笔画色)，第 1 笔当前(强调色)，其余轮廓
    svg = _step_svg(strokes, medians, style, 256, upto=2)
    assert svg.count(f'fill="{style.strokeColor}"') >= 1   # 已写笔(含序号圈底)
    assert f'fill="{style.highlightColor}"' in svg         # 当前笔强调色
    assert f'fill="{style.outlineColor}"' in svg           # 未写笔轮廓
    assert ">2</text>" in svg                              # 序号 = 第 2 笔
    assert "<circle" in svg                                # 序号圆圈


def test_decompose_options_disabled():
    """关闭强调与序号后：当前笔用笔画色、无序号圆圈。"""
    data = char_data.load_char_data("水")
    strokes, medians = data["strokes"], data["medians"]
    style = StyleConfig(
        emphasizeDecomposeStroke=False,
        showStrokeNumbers=False,
        highlightColor="#E8A33D",
        strokeColor="#C0392B",
    )
    svg = _step_svg(strokes, medians, style, 256, upto=2)
    assert f'fill="{style.highlightColor}"' not in svg
    assert "<circle" not in svg
    assert svg.count(f'fill="{style.strokeColor}"') == 2  # 两笔都已写成笔画色
