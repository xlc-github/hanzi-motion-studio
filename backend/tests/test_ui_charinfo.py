"""UI 测试：中央区字形数据卡（笔画数 / 部首笔画 / 部首外）。"""
import asyncio
from playwright.async_api import async_playwright


async def read_metrics(pg):
    """从数据卡读出三个指标（按 label 定位其后的数值）。"""
    card = pg.locator("div").filter(has_text="字形数据").last
    out = {}
    for label in ["总笔画", "部首笔画", "部首外"]:
        block = pg.locator("div").filter(has_text=label).last
        out[label] = (await block.inner_text()).strip().replace("\n", " ")
    return out


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await b.new_page(viewport={"width": 1600, "height": 950})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("http://127.0.0.1:5173", wait_until="networkidle")
        await asyncio.sleep(1)

        # 添加「国」（8 笔，radStrokes=[0,1,7] → 部首 3，部首外 5）
        await pg.locator("textarea").first.fill("国")
        await pg.get_by_role("button", name="添加到生字表").click()
        await asyncio.sleep(1.5)
        body = await pg.locator("body").inner_text()
        assert "字形数据" in body and "部首笔画" in body and "部首外" in body
        assert "源自本地字库" in body
        print("[1] 字形数据卡渲染 OK")
        print("    国:", await read_metrics(pg))

        # 精确断言：在「字形数据」卡片容器内找数值
        card = pg.locator("div.rounded-xl").filter(has_text="字形数据").first
        card_text = await card.inner_text()
        assert "8" in card_text, "国总笔画应为 8"
        assert "3" in card_text, "国部首笔画应为 3"
        assert "5" in card_text, "国部首外应为 5"
        print("[2] 国字数值正确：总笔画8 / 部首3 / 部首外5 ✓")

        # 清空后只加「水」（4 笔，无 radStrokes → 部首 0，部首外 4）
        clear = pg.locator("button").filter(has_text="清空").first
        if await clear.count():
            await clear.click()
            await asyncio.sleep(0.3)
        await pg.locator("textarea").first.fill("水")
        await pg.get_by_role("button", name="添加到生字表").click()
        await asyncio.sleep(1.5)
        card = pg.locator("div.rounded-xl").filter(has_text="字形数据").first
        card_text = await card.inner_text()
        assert "4" in card_text, "水总笔画应为 4"
        assert "独体 / 无部首" in card_text, "水应标注独体/无部首"
        print("[3] 切字更新正确：水=4笔、独体/无部首 ✓")

        await pg.screenshot(path="backend/tests/_e2e_out/ui_charinfo.png", full_page=True)
        print("[4] 截图已保存")

        assert not errs, f"页面错误: {errs}"
        print("[5] 无控制台错误")
        await b.close()
    print("\n=== 字形数据卡 UI 测试通过 ===")


if __name__ == "__main__":
    asyncio.run(main())
