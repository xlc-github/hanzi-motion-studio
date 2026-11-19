"""HanziMotion Studio FastAPI 入口。"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import BASE_DIR
from app.db.database import init_db
from app.api import chars, export, projects

app = FastAPI(
    title="HanziMotion Studio API",
    version="0.1.0",
    description="汉字笔顺动画工坊后端服务",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def health():
    return JSONResponse(
        {"status": "ok", "service": "hanzi-motion-studio", "version": "0.1.0"}
    )


app.include_router(chars.router)
app.include_router(export.router)
app.include_router(projects.router)

# 生产模式托管前端构建产物（若存在）
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static")
