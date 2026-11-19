"""UI 测试：教学素材三块（笔顺分解墙 / 路径图 / 练习页）。"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await b.new_page(viewport={"width": 1600, "height": 1000})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("http://127.0.0.1:5173", wait_until="networkidle")
        await asyncio.sleep(1)

        # 添加「国」
        await pg.locator("textarea").first.fill("国")
        await pg.get_by_role("button", name="添加到生字表").click()
        await asyncio.sleep(1.5)

        body = await pg.locator("body").inner_text()
        assert "教学素材" in body
        print("[0] 教学素材区渲染 OK")

        # Tab 1：笔顺分解墙 —— 8 个步骤格 + 可点
        await pg.get_by_role("tab", name="笔顺分解").click()
        await asyncio.sleep(0.8)
        jumps = pg.locator('button[title^="跳到第"]')
        n = await jumps.count()
        assert n == 8, f"分解墙应有 8 步，实际 {n}"
        print(f"[1] 分解墙 {n} 格 OK")

        # 点击第 5 步 → 画布进度变为 5
        await pg.locator('button[title="跳到第 5 笔"]').click()
        await asyncio.sleep(0.8)
        progress = await pg.locator("body").inner_text()
        assert "5 / 8" in progress, "点击第5步后进度应为 5/8"
        print("[2] 点击缩略墙跳转画布 OK（5/8）")

        # Tab 2：路径图 —— 含图例与 medians 轨迹
        await pg.get_by_role("tab", name="路径图").click()
        await asyncio.sleep(0.8)
        body = await pg.locator("body").inner_text()
        assert "起笔位置与顺序" in body and "运笔轨迹" in body, "路径图图例应存在"
        polylines = pg.locator("polyline")
        assert await polylines.count() >= 8, "路径图应含 >=8 条轨迹"
        print(f"[3] 路径图 OK（{await polylines.count()} 条轨迹 + 图例）")

        # Tab 3：练习页 —— A4 SVG + 打印/导出按钮
        await pg.get_by_role("tab", name="练习页").click()
        await asyncio.sleep(0.8)
        body = await pg.locator("body").inner_text()
        assert "范字" in body and "描红练习" in body
        assert await pg.get_by_role("button", name="打印").count() == 1
        assert await pg.get_by_role("button", name="导出 SVG").count() == 1
        print("[4] 练习页 OK（A4 + 打印 + 导出按钮）")

        await pg.screenshot(path="backend/tests/_e2e_out/ui_materials_grid.png", full_page=True)
        await pg.get_by_role("tab", name="笔顺分解").click()
        await asyncio.sleep(0.5)
        await pg.screenshot(path="backend/tests/_e2e_out/ui_materials_all.png", full_page=True)
        print("[5] 截图已保存")

        assert not errs, f"页面错误: {errs}"
        print("[6] 无控制台错误")
        await b.close()
    print("\n=== 教学素材三块 UI 测试通过 ===")


if __name__ == "__main__":
    asyncio.run(main())
