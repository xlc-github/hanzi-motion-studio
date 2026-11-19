"""UI 测试：练习页导出 PDF + 中央预览区尺寸收缩。"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await b.new_page(viewport={"width": 1600, "height": 1000}, accept_downloads=True)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("http://127.0.0.1:5173", wait_until="networkidle")
        await asyncio.sleep(1)

        # 添加「国」
        await pg.locator("textarea").first.fill("国")
        await pg.get_by_role("button", name="添加到生字表").click()
        await asyncio.sleep(1.5)

        # [0] 中央预览画布宽度应为 340（sizeOverride），不再是 512
        # HanziCanvas 最外层画布 div 有 style width:340px
        canvas_w = await pg.evaluate("""() => {
            const els = [...document.querySelectorAll('div')].filter(
                d => d.style && d.style.width === '340px' && d.style.height === '340px'
            );
            return els.length;
        }""")
        assert canvas_w >= 1, "未找到 340px 预览画布，布局收缩未生效"
        print(f"[0] 预览画布收缩到 340px OK（匹配 {canvas_w} 个）")

        # [1] 切到练习页 Tab，检查导出 PDF 按钮
        await pg.get_by_role("tab", name="练习页").click()
        await asyncio.sleep(0.8)
        pdf_btn = pg.get_by_role("button", name="导出 PDF")
        assert await pdf_btn.count() >= 1, "练习页缺少「导出 PDF」按钮"
        print("[1] 练习页「导出 PDF」按钮存在 OK")

        # [2] 点击导出 PDF，等待导出队列出现「练习页PDF」任务并完成
        await pdf_btn.first.click()
        # 进度完成最多等 40s
        done = False
        for _ in range(80):
            body = await pg.locator("body").inner_text()
            if "练习页PDF" in body and ("100%" in body):
                done = True
                break
            await asyncio.sleep(0.5)
        assert done, f"PDF 导出任务未完成，body 片段: {body[:300]}"
        print("[2] 导出队列出现「练习页PDF」且进度 100% OK")

        # [3] 无 JS 错误
        assert not errs, f"控制台错误: {errs}"
        print("[3] 无 JS 控制台错误 OK")

        await pg.screenshot(path="backend/tests/_e2e_out/ui_pdf_layout.png", full_page=True)
        await b.close()
        print("ALL PASS")


if __name__ == "__main__":
    asyncio.run(main())
