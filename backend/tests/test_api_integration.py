"""API 集成测试（需要后端运行在 8100）。运行：python tests/test_api_integration.py"""
import time
import httpx

BASE = "http://127.0.0.1:8100"

def main():
    c = httpx.Client(base_url=BASE, timeout=30)
    print("[1] 健康检查")
    r = c.get("/api/health"); assert r.status_code == 200, r.text
    print("   ", r.json())

    print("[2] 字库列表")
    r = c.get("/api/chars/available"); d = r.json()
    assert d["count"] >= 40
    print("    字库字数:", d["count"])

    print("[3] 批量校验")
    r = c.post("/api/chars/validate", json={"chars": ["烧", "武", "龘"]}); d = r.json()
    assert d["results"][0]["available"] and not d["results"][2]["available"]
    print("    校验正确")

    print("[4] 项目 CRUD")
    r = c.post("/api/projects", json={"name": "测试单元", "chars": ["烧", "武", "镇"]}); p = r.json()
    pid = p["id"]
    assert p["chars"] == ["烧", "武", "镇"]
    r = c.put(f"/api/projects/{pid}", json={"name": "改名", "chars": ["烧"]}); assert r.json()["name"] == "改名"
    r = c.get("/api/projects"); assert any(x["id"] == pid for x in r.json()["projects"])
    c.delete(f"/api/projects/{pid}")
    print("    项目 CRUD 通过")

    print("[5] 模板与历史")
    assert c.get("/api/templates").status_code == 200
    assert c.get("/api/history").status_code == 200
    print("    通过")

    print("[6] PNG 导出（异步任务 + 轮询）")
    payload = {
        "char": "武",
        "style": {"transparent": True, "strokeColor": "#C0392B", "grid": "tian"},
        "anim": {"speed": 1, "strokeGap": 150, "fps": 25},
        "size": 256,
    }
    r = c.post("/api/export/png", json=payload); tid = r.json()["taskId"]
    url = _poll(c, tid)
    assert url and c.get(url).status_code == 200
    print("    PNG 导出成功:", url)

    print("[7] GIF 导出")
    r = c.post("/api/export/gif", json=payload); tid = r.json()["taskId"]
    url = _poll(c, tid)
    assert url and c.get(url).status_code == 200
    print("    GIF 导出成功:", url)

    print("[8] 导出历史已记录")
    r = c.get("/api/history"); assert len(r.json()["records"]) >= 2
    print("    历史记录数:", len(r.json()["records"]))

    print("\n全部 API 集成测试通过 ✓")


def _poll(c, tid, timeout=90):
    start = time.time()
    while time.time() - start < timeout:
        d = c.get(f"/api/export/tasks/{tid}").json()
        if d["status"] == "done":
            return d["downloadUrl"]
        if d["status"] == "failed":
            raise AssertionError(f"任务失败: {d['error']}")
        time.sleep(0.5)
    raise TimeoutError("导出超时")


if __name__ == "__main__":
    main()
