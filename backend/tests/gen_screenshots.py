"""生成 README 用的界面截图。需前后端服务运行在 5173 / 8100。

用法：python backend/tests/gen_screenshots.py
输出：docs/screenshots/*.png
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path(__file__).resolve().parents[2] / "docs" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
URL = "http://127.0.0.1:5173"


async def add_char(pg, char):
    """清空生字表并添加指定字，返回后当前字即被选中。"""
    ta = pg.locator("textarea").first
    await ta.fill(char)
    add = pg.get_by_role("button", name="添加到生字表")
    if await add.count():
        await add.click()
    await asyncio.sleep(1.2)


async def scroll_main(pg, to_bottom=True):
    await pg.locator("main").evaluate(
        "el => el.scrollTop = " + ("el.scrollHeight" if to_bottom else "0")
    )
    await asyncio.sleep(0.5)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        pg = await browser.new_page(viewport={"width": 1600, "height": 1000}, device_scale_factor=2)
        await pg.goto(URL, wait_until="networkidle")
        await asyncio.sleep(1)

        # 添加多个字，展示生字表
        await pg.locator("textarea").first.fill("国 water 永 学 生".replace(" water ", ""))
        await pg.get_by_role("button", name="添加到生字表").click()
        await asyncio.sleep(1.5)

        # 1) 主工作台：三栏 + 数据卡（顶部视图）
        await scroll_main(pg, to_bottom=False)
        await pg.screenshot(path=str(OUT / "01-workbench.png"))

        # 2) 笔顺分解墙（点第 5 笔展示联动：画布定位+高亮）
        await pg.get_by_role("tab", name="笔顺分解").click()
        await asyncio.sleep(0.5)
        await pg.locator('button[title="跳到第 5 笔"]').click()
        await asyncio.sleep(0.8)
        await scroll_main(pg, to_bottom=False)
        await pg.screenshot(path=str(OUT / "02-stroke-grid.png"))

        # 3) 笔顺路径图
        await pg.get_by_role("tab", name="路径图").click()
        await asyncio.sleep(0.5)
        await scroll_main(pg, to_bottom=True)
        await pg.screenshot(path=str(OUT / "03-stroke-path.png"))

        # 4) A4 描红练习页
        await pg.get_by_role("tab", name="练习页").click()
        await asyncio.sleep(0.5)
        await scroll_main(pg, to_bottom=True)
        await pg.screenshot(path=str(OUT / "04-practice-sheet.png"))

        await browser.close()
        for f in sorted(OUT.glob("*.png")):
            print(f"{f.name}: {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    asyncio.run(main())
