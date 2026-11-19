# HanziMotion Studio 容器化构建
# 单容器多阶段：Stage 1 构建前端，Stage 2 运行 FastAPI（后端已静态托管前端 dist）
# 一个端口 8100 同时提供 UI 与 API，避免跨域/代理问题。

# ---------------- Stage 1: 构建前端 ----------------
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------------- Stage 2: 运行时 ----------------
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# FFmpeg 用于 GIF/MP4 编码；中文字体用于分解图总览的“第N步”标注
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python 依赖
COPY backend/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

# Playwright Chromium 及其系统依赖（离线渲染必需）
RUN playwright install --with-deps chromium

# 后端代码（含 data/hanzi 字库、scripts）
COPY backend/ ./backend/

# 前端构建产物放到 main.py 静态托管期望的位置：/<项目根>/frontend/dist
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

WORKDIR /app/backend
EXPOSE 8100

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8100"]
