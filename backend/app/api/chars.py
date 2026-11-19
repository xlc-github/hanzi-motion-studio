"""汉字数据 API。"""
from fastapi import APIRouter

from app.models.schemas import ValidateCharsRequest, CharDataOut
from app.services import char_data

router = APIRouter(prefix="/api/chars", tags=["chars"])


@router.get("/available")
def get_available():
    chars = char_data.available_chars()
    return {"count": len(chars), "chars": chars}


@router.post("/validate")
def validate(req: ValidateCharsRequest):
    results = []
    for c in req.chars:
        available = char_data.char_available(c)
        results.append(
            CharDataOut(
                char=c,
                available=available,
                strokeCount=char_data.stroke_count(c) if available else 0,
            )
        )
    return {"results": [r.model_dump() for r in results]}


@router.get("/{char}/data")
def get_data(char: str):
    data = char_data.load_char_data(char)
    if data is None:
        return CharDataOut(char=char, available=False).model_dump()
    return CharDataOut(
        char=char,
        available=True,
        strokeCount=len(data.get("strokes", [])),
        data=data,
    ).model_dump()
