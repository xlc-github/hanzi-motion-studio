"""Pydantic 请求/响应模型。"""
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field


class StyleConfig(BaseModel):
    grid: Literal["tian", "mi", "none"] = "tian"
    gridColor: str = "#C0392B"
    gridLineWidth: float = 1.0
    background: str = "#FDF9F0"
    transparent: bool = False
    strokeColor: str = "#C0392B"
    outlineColor: str = "#D8D3C8"
    highlightColor: str = "#E8A33D"
    glyphScale: float = 0.82
    padding: int = 20
    borderRadius: int = 0
    highlightFirstStroke: bool = False
    highlightCurrentStroke: bool = True
    # 分解图：当前笔起点标注序号（红圈白字）
    showStrokeNumbers: bool = True
    # 分解图：当前笔用强调色填充（其余已写笔用笔画色）
    emphasizeDecomposeStroke: bool = True


class AnimConfig(BaseModel):
    speed: float = Field(default=1.0, gt=0)
    strokeGap: int = 280
    loopGap: int = 1200
    loop: bool = False
    headPause: int = 400
    tailPause: int = 800
    fps: int = Field(default=30, ge=1, le=60)


class ExportRequest(BaseModel):
    char: str
    style: StyleConfig = Field(default_factory=StyleConfig)
    anim: AnimConfig = Field(default_factory=AnimConfig)
    size: int = 512
    loopCount: int = Field(default=0, ge=0, le=20)


class BatchExportRequest(BaseModel):
    chars: List[str]
    format: Literal["gif", "mp4", "png", "svg"] = "gif"
    style: StyleConfig = Field(default_factory=StyleConfig)
    anim: AnimConfig = Field(default_factory=AnimConfig)
    size: int = 512
    loopCount: int = 0


class BundleExportRequest(BaseModel):
    """批量导出并打包为单个 ZIP。"""
    chars: List[str]
    format: Literal["gif", "mp4", "png", "svg"] = "gif"
    style: StyleConfig = Field(default_factory=StyleConfig)
    anim: AnimConfig = Field(default_factory=AnimConfig)
    size: int = 512
    loopCount: int = 0


class DecomposeRequest(BaseModel):
    """笔画分解图：逐笔步骤图 + 总览，打包 ZIP。"""
    char: str
    style: StyleConfig = Field(default_factory=StyleConfig)
    size: int = 256
    image_format: Literal["png", "svg"] = "png"


class PracticePdfRequest(BaseModel):
    """练习页 PDF：前端已渲染好的 A4 SVG，后端转成 PDF。
    SVG 是唯一真相源，保证 PDF 与屏幕预览完全一致（所见即所得）。"""
    char: str
    svg: str


class ValidateCharsRequest(BaseModel):
    chars: List[str]


class CharDataOut(BaseModel):
    char: str
    available: bool
    strokeCount: int = 0
    data: Optional[dict[str, Any]] = None
