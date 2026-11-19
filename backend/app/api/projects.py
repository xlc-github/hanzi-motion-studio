"""项目 / 模板 / 导出历史 CRUD API（SQLite 持久化）。"""
import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.database import db

router = APIRouter(prefix="/api", tags=["projects"])


class ProjectIn(BaseModel):
    name: str
    chars: list[str]


class TemplateIn(BaseModel):
    name: str
    style_json: str
    anim_json: str
    builtin: bool = False


@router.get("/projects")
def list_projects():
    with db() as conn:
        rows = conn.execute("SELECT * FROM projects ORDER BY updated_at DESC").fetchall()
    return {"projects": [_project(r) for r in rows]}


@router.post("/projects")
def create_project(body: ProjectIn):
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO projects(name, chars) VALUES (?, ?)",
            (body.name, json.dumps(body.chars, ensure_ascii=False)),
        )
        row = conn.execute("SELECT * FROM projects WHERE id=?", (cur.lastrowid,)).fetchone()
    return _project(row)


@router.put("/projects/{pid}")
def update_project(pid: int, body: ProjectIn):
    with db() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
        if not row:
            raise HTTPException(404, "项目不存在")
        conn.execute(
            "UPDATE projects SET name=?, chars=?, updated_at=datetime('now') WHERE id=?",
            (body.name, json.dumps(body.chars, ensure_ascii=False), pid),
        )
        updated = conn.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
    return _project(updated)


@router.delete("/projects/{pid}")
def delete_project(pid: int):
    with db() as conn:
        conn.execute("DELETE FROM projects WHERE id=?", (pid,))
    return {"ok": True}


@router.get("/templates")
def list_templates():
    with db() as conn:
        rows = conn.execute("SELECT * FROM templates ORDER BY id").fetchall()
    return {"templates": [_template(r) for r in rows]}


@router.post("/templates")
def create_template(body: TemplateIn):
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO templates(name, style_json, anim_json, builtin) VALUES (?,?,?,?)",
            (body.name, body.style_json, body.anim_json, int(body.builtin)),
        )
        row = conn.execute("SELECT * FROM templates WHERE id=?", (cur.lastrowid,)).fetchone()
    return _template(row)


@router.delete("/templates/{tid}")
def delete_template(tid: int):
    with db() as conn:
        conn.execute("DELETE FROM templates WHERE id=? AND builtin=0", (tid,))
    return {"ok": True}


@router.get("/history")
def list_history():
    with db() as conn:
        rows = conn.execute("SELECT * FROM export_records ORDER BY created_at DESC LIMIT 100").fetchall()
    return {"records": [_record(r) for r in rows]}


@router.delete("/history/{rid}")
def delete_history(rid: int):
    with db() as conn:
        conn.execute("DELETE FROM export_records WHERE id=?", (rid,))
    return {"ok": True}


def _project(r):
    return {
        "id": r["id"], "name": r["name"],
        "chars": json.loads(r["chars"]),
        "createdAt": r["created_at"], "updatedAt": r["updated_at"],
    }


def _template(r):
    return {
        "id": r["id"], "name": r["name"],
        "style": json.loads(r["style_json"]),
        "anim": json.loads(r["anim_json"]),
        "builtin": bool(r["builtin"]),
    }


def _record(r):
    return {
        "id": r["id"], "chars": json.loads(r["chars"]),
        "format": r["format"],
        "params": json.loads(r["params_json"]),
        "outputPath": r["output_path"],
        "status": r["status"], "createdAt": r["created_at"],
    }
