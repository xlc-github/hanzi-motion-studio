"""端到端测试：ZIP 批量打包 / 分解图 / 项目模板历史 CRUD。"""
import io
import time
import httpx
import zipfile

BASE = "http://127.0.0.1:8100"

DEFAULT_STYLE = {
    "grid": "tian", "gridColor": "#C0392B", "gridLineWidth": 1,
    "background": "#FDF9F0", "transparent": False, "strokeColor": "#C0392B",
    "outlineColor": "#D8D3C8", "highlightColor": "#E8A33D", "glyphScale": 0.82,
    "padding": 20, "borderRadius": 0, "highlightFirstStroke": False,
    "highlightCurrentStroke": True, "showStrokeNumbers": True,
    "emphasizeDecomposeStroke": True,
}
DEFAULT_ANIM = {
    "speed": 1, "strokeGap": 80, "loopGap": 1200, "loop": False,
    "headPause": 100, "tailPause": 100, "fps": 20,
}


def wait_task(client, tid, timeout=180):
    start = time.time()
    while time.time() - start < timeout:
        r = client.get(f"{BASE}/api/export/tasks/{tid}")
        r.raise_for_status()
        t = r.json()
        if t["status"] == "done":
            return t
        if t["status"] == "failed":
            raise RuntimeError(f"任务失败: {t.get('error')}")
        time.sleep(0.5)
    raise TimeoutError("任务超时")


def main():
    with httpx.Client(timeout=30) as c:
        assert c.get(f"{BASE}/api/health").json()["status"] == "ok"
        print("[0] 健康检查 OK")

        # ---- 1. ZIP 批量打包（用 png 快速验证，2 个字）----
        r = c.post(f"{BASE}/api/export/bundle", json={
            "chars": ["烧", "武"], "format": "png",
            "style": DEFAULT_STYLE, "anim": DEFAULT_ANIM, "size": 256,
        })
        r.raise_for_status()
        tid = r.json()["taskId"]
        t = wait_task(c, tid)
        print(f"[1] bundle 任务完成, progress={t['progress']}, url={t.get('downloadUrl')}")
        url = t["downloadUrl"]
        zr = c.get(f"{BASE}{url}")
        zr.raise_for_status()
        zf = zipfile.ZipFile(io.BytesIO(zr.content))
        names = zf.namelist()
        print(f"[1] ZIP 内容: {names}, 大小 {len(zr.content)} bytes")
        assert len(names) == 2, f"应有 2 个文件，实际 {names}"
        assert all(n.endswith(".png") for n in names)

        # ---- 2. 分解图导出（SVG 格式，快）----
        r = c.post(f"{BASE}/api/export/decompose", json={
            "char": "水", "style": DEFAULT_STYLE, "size": 128, "image_format": "svg",
        })
        r.raise_for_status()
        tid = r.json()["taskId"]
        t = wait_task(c, tid)
        print(f"[2] decompose(SVG) 任务完成, url={t.get('downloadUrl')}")
        zr = c.get(f"{BASE}{t['downloadUrl']}")
        zr.raise_for_status()
        zf = zipfile.ZipFile(io.BytesIO(zr.content))
        names = zf.namelist()
        print(f"[2] 分解图 ZIP 内容: {names}")
        # 水 = 4 笔 → 4 步骤 + 1 总览 = 5 个文件
        assert len(names) == 5, f"应有 5 个文件（4步+总览），实际 {names}"
        ov = [n for n in names if n.startswith("overview")][0]
        content = zf.read(ov).decode("utf-8")
        assert "<svg" in content and "第1步" in content
        print("[2] 总览图含 SVG 与步骤标注 ✓")
        # 序号标注 + 当前笔强调色（第 1 步 SVG）
        step1 = [n for n in names if n.startswith("step_水_01")][0]
        s1 = zf.read(step1).decode("utf-8")
        assert "<circle" in s1 and ">1</text>" in s1, "第 1 步应含序号圆圈与序号 1"
        assert DEFAULT_STYLE["highlightColor"] in s1, "当前笔应使用强调色"
        print("[2] 分解图序号标注与当前笔强调色 ✓")

        # ---- 3. 分解图 PNG 格式 ----
        r = c.post(f"{BASE}/api/export/decompose", json={
            "char": "水", "style": DEFAULT_STYLE, "size": 96, "image_format": "png",
        })
        r.raise_for_status()
        t = wait_task(c, r.json()["taskId"])
        zr = c.get(f"{BASE}{t['downloadUrl']}")
        zf = zipfile.ZipFile(io.BytesIO(zr.content))
        assert len(zf.namelist()) == 5
        step0 = [n for n in zf.namelist() if n.startswith("step")][0]
        assert zf.read(step0).startswith(b"\x89PNG")
        print(f"[3] decompose(PNG) OK: {len(zf.namelist())} 文件")

        # ---- 4. 项目 CRUD ----
        p = c.post(f"{BASE}/api/projects", json={"name": "测试火烧云", "chars": ["烧", "威", "武"]}).json()
        pid = p["id"]
        assert c.get(f"{BASE}/api/projects").json()["projects"]
        p2 = c.put(f"{BASE}/api/projects/{pid}", json={"name": "测试改名", "chars": ["烧"]}).json()
        assert p2["name"] == "测试改名"
        c.delete(f"{BASE}/api/projects/{pid}")
        print("[4] 项目 CRUD OK")

        # ---- 5. 模板 CRUD ----
        import json
        tpl = c.post(f"{BASE}/api/templates", json={
            "name": "测试模板", "style_json": json.dumps(DEFAULT_STYLE),
            "anim_json": json.dumps(DEFAULT_ANIM), "builtin": False,
        }).json()
        tid_ = tpl["id"]
        assert any(x["id"] == tid_ for x in c.get(f"{BASE}/api/templates").json()["templates"])
        c.delete(f"{BASE}/api/templates/{tid_}")
        print("[5] 模板 CRUD OK")

        # ---- 6. 历史记录 ----
        recs = c.get(f"{BASE}/api/history").json()["records"]
        assert len(recs) >= 1
        print(f"[6] 历史记录 {len(recs)} 条")

    print("\n=== 全部新功能测试通过 ===")


if __name__ == "__main__":
    main()
