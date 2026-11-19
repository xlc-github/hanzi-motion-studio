"""UI 测试：新版字形数据卡（客观指标 + 部首高亮 + 逐笔长度联动）。"""
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

        await pg.locator("textarea").first.fill("国")
        await pg.get_by_role("button", name="添加到生字表").click()
        await asyncio.sleep(1.5)

        body = await pg.locator("body").inner_text()
        assert "字形数据" in body and "逐笔长度" in body, "信息卡标题/逐笔长度区应存在"
        assert "轨迹总长" in body and "字形比例" in body, "次级指标应存在"
        print("[0] 信息卡新区块渲染 OK")

        # 总笔画 = 8，部首笔画 = 3（国 radStrokes=[0,1,7]）
        card = pg.locator("text=字形数据").locator("xpath=ancestor::*[contains(@class,'rounded')][1]")
        card_text = await card.inner_text()
        assert "8" in card_text and "3" in card_text, f"国应为 8 笔/部首 3，实际: {card_text}"
        print("[1] 国的笔画指标 8/3 OK")

        # 8 根逐笔长度条
        bars = pg.locator('button[aria-label^="定位到第"]')
        n = await bars.count()
        assert n == 8, f"逐笔长度条应为 8，实际 {n}"
        print(f"[2] 逐笔长度条 {n} 根 OK")

        # 点击"定位到第 5 笔" → 画布进度 5/8
        await pg.locator('button[aria-label="定位到第 5 笔"]').click()
        await asyncio.sleep(0.8)
        prog = await pg.locator("body").inner_text()
        assert "5 / 8" in prog, "点击长度条应定位到第 5 笔"
        print("[3] 长度条点击定位 OK（5/8）")

        # 部首高亮按钮存在且可 toggle（国是合体字有部首）
        rad_btn = pg.locator('button[aria-label="高亮部首笔画"]')
        assert await rad_btn.count() >= 1, "部首高亮按钮应存在"
        pressed_before = await rad_btn.first.get_attribute("aria-pressed")
        await rad_btn.first.click()
        await asyncio.sleep(0.4)
        pressed_after = await rad_btn.first.get_attribute("aria-pressed")
        assert pressed_before != pressed_after, "点击后 aria-pressed 应切换"
        print(f"[4] 部首高亮 toggle OK（{pressed_before} → {pressed_after}）")

        # 无障碍：进度条 role
        progbar = pg.locator('[role="progressbar"]')
        assert await progbar.count() >= 1, "进度条应有 role=progressbar"
        valuenow = await progbar.first.get_attribute("aria-valuenow")
        assert valuenow is not None, "进度条应有 aria-valuenow"
        print(f"[5] 无障碍 progressbar OK（aria-valuenow={valuenow}）")

        assert not errs, f"控制台错误: {errs}"
        print("[6] 无 JS 控制台错误 OK")

        await pg.screenshot(path="backend/tests/_e2e_out/ui_charinfo_v2.png", full_page=True)
        await b.close()
        print("ALL PASS")


if __name__ == "__main__":
    asyncio.run(main())
