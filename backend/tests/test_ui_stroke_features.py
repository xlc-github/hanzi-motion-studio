"""UI 测试：分解图设置开关 + 画布当前笔序号徽章。"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await b.new_page(viewport={"width": 1440, "height": 900})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("http://127.0.0.1:5173", wait_until="networkidle")
        await asyncio.sleep(1)

        # 添加生字「国」
        await pg.locator("textarea").first.fill("国")
        await pg.get_by_role("button", name="添加到生字表").click()
        await asyncio.sleep(1.2)

        # 切到样式 Tab
        await pg.get_by_role("tab", name="样式").click()
        await asyncio.sleep(0.5)
        body = await pg.locator("body").inner_text()
        assert "当前笔强调色" in body and "笔画序号标注" in body, "分解图设置项应存在"
        print("[1] 样式面板含「当前笔强调色」「笔画序号标注」开关 ✓")

        # 两个开关默认应为开启（aria-checked=true）
        switches = pg.get_by_role("switch")
        labels = pg.locator("label")
        # 通过文字定位开关所在行
        row_emph = pg.locator("div").filter(has_text="当前笔强调色").last
        row_num = pg.locator("div").filter(has_text="笔画序号标注").last
        s_emph = row_emph.get_by_role("switch")
        s_num = row_num.get_by_role("switch")
        assert await s_emph.get_attribute("aria-checked") == "true", "强调色默认开"
        assert await s_num.get_attribute("aria-checked") == "true", "序号默认开"
        print("[2] 两个开关默认开启 ✓")

        # 触发逐笔：点击「下一笔」，画布应出现序号徽章 aria-label=第 N 笔
        await pg.get_by_role("button", name="下一笔").click()
        await asyncio.sleep(0.6)
        badge = pg.locator('[aria-label="第 1 笔"]')
        assert await badge.count() >= 1, "画布应显示第 1 笔序号徽章"
        print("[3] 画布当前笔序号徽章渲染 ✓")

        # 关闭序号开关后徽章消失
        await s_num.click()
        await asyncio.sleep(0.5)
        assert await pg.locator('[aria-label="第 1 笔"]').count() == 0, "关闭后徽章应消失"
        print("[4] 关闭序号后徽章消失 ✓")

        await pg.screenshot(path="tests/_e2e_out/ui_stroke_features.png", full_page=True)
        print("[5] 截图已保存")

        assert not errs, f"页面错误: {errs}"
        print("[6] 无控制台错误")
        await b.close()
    print("\n=== 笔画序号 UI 测试通过 ===")


if __name__ == "__main__":
    asyncio.run(main())
