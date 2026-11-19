# 第三方开源许可证声明 / Third-Party Notices

HanziMotion Studio 依赖以下开源项目，按其许可证要求保留声明。

---

## 1. Hanzi Writer（笔画动画库）

- 项目：https://github.com/chanind/hanzi-writer
- 许可证：**MIT License**
- Copyright (c) 2014 David Chanin

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## 2. hanzi-writer-data（汉字笔画数据）

- 项目：https://github.com/chanind/hanzi-writer-data
- 数据来源：源自 Make Me A Hanzi 项目，后者从 Arphic Technology 字体中提取
- 许可证：**Arphic Public License**

> 笔画 SVG 与笔顺数据依据 Arphic Public License 发布。重新分发或修改这些数据须遵守 Arphic Public License 条款。本产品随附原始数据文件，未修改其许可声明。
>
> 参考：https://github.com/chanind/hanzi-writer-data/blob/master/LICENSE

**合规要点**：
- 随产品分发笔画数据时保留 Arphic Public License 声明。
- 基于笔画数据生成的动画/图片不构成对原数据的"衍生作品"再分发限制，但保留来源声明是良好实践。

---

## 3. 其他依赖

| 组件 | 许可证 |
|---|---|
| React | MIT |
| Vite | MIT |
| Tailwind CSS | MIT |
| Zustand | MIT |
| FastAPI | MIT |
| Uvicorn | BSD-3-Clause |
| Pydantic | MIT |
| Playwright | Apache-2.0 |
| FFmpeg | LGPL-2.1+ / GPL（依构建而定，本机 gyan.dev essentials 为 GPL 构建） |
| Radix UI (shadcn/ui 底层) | MIT |

完整依赖许可证清单可通过 `pip list` / `npm ls` 查看各包自带 LICENSE 文件。
