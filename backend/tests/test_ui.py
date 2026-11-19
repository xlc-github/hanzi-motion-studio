"""前端 UI 冒烟测试（需前端 dev server 5173 + 后端 8100）。"""
import asyncio
from playwright.async_api import async_playwright

URL = "http://127.0.0.1:5173/"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        await page.goto(URL, wait_until="networkidle")
        await asyncio.sleep(1)

        # 检查三栏结构
        assert await page.locator("text=HanziMotion Studio").count() > 0
        assert await page.locator("text=实时预览").count() > 0
        assert await page.locator("text=导出任务队列").count() > 0
        print("[1] 三栏 UI 渲染正常")

        # 输入汉字
        textarea = page.locator("textarea")
        await textarea.fill("火烧云")
        await page.get_by_role("button", name="添加到生字表").click()
        await asyncio.sleep(2)
        cards = await page.locator("text=缺数据").count()
        assert await page.locator("text=10 笔").count() >= 1, "烧应有10笔"
        print("[2] 汉字输入与卡片列表正常")

        # 切换模板（先切到"模板" Tab）
        await page.get_by_role("tab", name="模板").click()
        await asyncio.sleep(0.3)
        await page.get_by_text("米字格教学").click()
        await asyncio.sleep(0.5)
        print("[3] 模板切换正常")

        # 播放动画（切回样式 Tab 无影响，控制在中间舞台）
        await page.get_by_role("button", name="播放", exact=True).click()
        await asyncio.sleep(0.8)
        paths = await page.locator("#root svg path").count()
        assert paths > 0, "Hanzi Writer 应渲染 SVG path"
        # 等待逐笔动画完成，进度应到达 4/4
        await asyncio.sleep(4)
        progress = await page.locator("text=/\\d+ \\/ 4/").first.inner_text()
        print(f"[4] 播放动画正常，SVG path: {paths}，播放后进度: {progress}")
        assert "4 / 4" in progress or "4/4" in progress.replace(" ", ""), f"进度未到4/4: {progress}"

        # 截图
        await page.screenshot(path="tests/_e2e_out/ui_full.png", full_page=True)
        print("[5] 截图已保存")

        if errors:
            print("\n⚠️ 控制台错误:")
            for e in errors[:10]:
                print("   ", e)
        else:
            print("\n无控制台错误 ✓")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
