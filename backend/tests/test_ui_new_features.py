"""UI 测试：资料库 Tab / 分解图导出 / 批量 ZIP 提示，并截图。"""
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

        # 添加生字
        await pg.locator("textarea").first.fill("烧武")
        await pg.get_by_role("button", name="添加到生字表").click()
        await asyncio.sleep(1.2)
        print("[1] 生字添加 OK")

        # 切到资料库 Tab
        await pg.get_by_role("tab", name="资料库").click()
        await asyncio.sleep(0.8)
        body = await pg.locator("body").inner_text()
        assert "生字项目" in body and "我的模板" in body and "导出历史" in body
        print("[2] 资料库三个分区渲染 OK")

        # 保存一个项目（项目名输入框）
        proj_input = pg.get_by_placeholder("项目名（如：火烧云）")
        await proj_input.fill("测试项目")
        await pg.locator("section").first.get_by_role("button").click()
        await asyncio.sleep(1)
        body = await pg.locator("body").inner_text()
        assert "测试项目" in body
        print("[3] 保存项目 OK，列表可见")

        # 切回生字编辑
        await pg.get_by_role("tab", name="生字编辑").click()
        await asyncio.sleep(0.5)

        # 切到导出 Tab，验证分解图区块
        await pg.get_by_role("tab", name="导出").click()
        await asyncio.sleep(0.5)
        body = await pg.locator("body").inner_text()
        assert "笔画分解图" in body
        print("[4] 分解图区块渲染 OK")

        # 切换导出范围为批量，验证 ZIP 提示（Radix Select：先点 trigger 再选 option）
        triggers = pg.get_by_role("combobox")
        # 导出范围是两个 Select 中的第二个
        await triggers.nth(1).click()
        await asyncio.sleep(0.4)
        await pg.get_by_role("option", name="全部生字（批量）").click()
        await asyncio.sleep(0.5)
        body = await pg.locator("body").inner_text()
        assert "打包为一个 ZIP" in body
        print("[5] 批量 ZIP 提示 OK")

        await pg.screenshot(path="tests/_e2e_out/ui_new_features.png", full_page=True)
        print("[6] 截图已保存")

        assert not errs, f"页面错误: {errs}"
        print("[7] 无控制台错误")
        await b.close()
    print("\n=== 新功能 UI 测试通过 ===")


if __name__ == "__main__":
    asyncio.run(main())
