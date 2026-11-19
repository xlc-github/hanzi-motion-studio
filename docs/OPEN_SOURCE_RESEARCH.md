# 开源项目研究与复用分析

> 研究对象：`hanzi-writer`、`hanzi-writer-data`、`Chinese-Stroke-Order-Generator`
> 研究日期：2026-11-19
> 研究方式：克隆仓库到 `references/` 目录，实读 README、package.json、核心源码、许可证（不依赖项目名称猜测）
> 结论摘要：本项目的技术选型整体正确且更先进；三个项目均无可以直接"整体搬运"的部分，但有明确的算法与工程实践可借鉴。

---

## 0. 研究方法与版本基线

| 仓库 | 克隆后版本 | 许可证 | 技术栈 |
|---|---|---|---|
| chanind/hanzi-writer | 3.0.0（源码最新提交 2025-12-31） | **MIT** | TypeScript，零运行时依赖，Rollup 打包 |
| chanind/hanzi-writer-data | 2.0.1（**9575** 个汉字） | **Arphic Public License** | 纯 JSON 数据，零依赖 |
| Yark-yao/Chinese-Stroke-Order-Generator | 1.0.0 | **MIT**（原创代码） | Node + Puppeteer 25.6 + FFmpeg |

> 许可证提醒：**Hanzi Writer 代码是 MIT，但笔画数据是 Arphic Public License，两者不同**。本项目已在 `THIRD_PARTY_NOTICES.md` 中分别声明，符合合规要求。参考项目同样在其 README 中做了区分声明——这是行业惯例，我们保持一致。

---

## 1. Hanzi Writer（核心动画引擎）

### 1.1 笔顺动画原理（源码实证）

阅读 `src/characterActions.ts` 与 `src/renderers/svg/StrokeRenderer.ts` 后确认：

- **单笔动画时长公式**（`characterActions.ts`）：
  ```ts
  const duration = (stroke.getLength() + 600) / (3 * speed)
  ```
  即笔画越长写得越久，这是官方按笔画几何长度自适应的真实算法。我们无需、也不应重复实现。
- **SVG 显现机制**：每笔用一个 `clipPath` + 一个超宽 mask 路径（沿 medians 生成），动画过程只改 `stroke-dashoffset`，配合 `stroke-dasharray` 实现"沿轨迹逐步显现"，而不是透明度淡入。这就是为什么必须用真实 `strokes` + `medians` 数据。
- **渲染器双实现**：`svg/` 与 `canvas/` 两套 renderer，通过 `renderer: 'svg' | 'canvas'` 切换。本项目导出用 `svg`，利用其矢量清晰度。

### 1.2 动画控制 API（实证清单）

`src/HanziWriter.ts` 公开方法：`create`、`loadCharacterData`、`getScalingTransform`、`showCharacter`、`hideCharacter`、`animateCharacter`、`animateStroke`、`highlightStroke`、`loopCharacterAnimation`、`pauseAnimation`、`resumeAnimation`、`showOutline`、`hideOutline`、`updateDimensions`、`updateColor`、`quiz`、`skipQuizStroke`、`cancelQuiz`、`setCharacter`、`getCharacterData`。

**一个非常关键的发现**：`animateCharacter(options)` 与 `animateStroke(strokeNum, options)` 的 `options` **只支持 `onComplete`**（见源码 174-220 行），**没有 `onProgress`**。参考项目 `index.html` 里写的 `onProgress` 是旧版遗留，在 3.x 已被移除。

> ✅ **印证本项目设计**：我们从一开始就用"顺序调用 `animateStroke(0..n)` + 手动状态管理"来实现逐笔进度跟踪，是唯一正确的做法，不能依赖不存在的进度回调。

### 1.3 参数演进（避免踩坑）

- `strokeAnimationSpeed`（现行）：数值越大越快，默认 1。
- `strokeAnimationDuration`（**已废弃**）：源码 478-480 行做向后兼容换算 `speed = 500 / duration`。
- 参考项目用的是已废弃的 `strokeAnimationDuration: 1200`；**本项目用 `strokeAnimationSpeed`，是更现代的 API**。

### 1.4 可复用能力 vs 需自行实现

| 可复用（官方能力，直接调用） | 本项目需自行实现 |
|---|---|
| 逐笔书写动画算法（按笔画长度自适应时长） | 逐笔进度跟踪（官方无进度回调，用 animateStroke 串联） |
| SVG / Canvas 双渲染器 | "上一笔/下一笔"的状态重放逻辑 |
| 循环播放 `loopCharacterAnimation` | 暂停后续播的 token 打断机制 |
| 颜色/高亮 `updateColor` / `highlightStroke` | 首尾笔画高亮的教学语义 |
| 笔画数据加载器 `charDataLoader` | 本地优先 + CDN 回退的离线加载策略 |
| `setCharacter` 动态换字 | 与 Zustand 状态中心的集成 |

---

## 2. Hanzi Writer Data（笔画数据库）

### 2.1 数据结构（实证）

每个汉字 JSON 三个字段（以"烧"为例，10 笔）：

| 字段 | 类型 | 含义 |
|---|---|---|
| `strokes` | `string[]` | 每笔的 SVG path（`d` 属性），坐标系 0..1024 |
| `medians` | `number[][]` | 每笔的轨迹采样点，如 `[[167,559],[175,470],...]`，用于计算笔画长度与动画方向 |
| `radStrokes` | `number[]` | 部首笔画索引（"烧"有 4 个），可做偏旁高亮 |

> 注意：仓库中**没有 `decomposition`（分解图）字段**——那是 Make Me A Hanzi 原始数据的字段，发布到本包时被剥离。因此"笔画分解图"需由 `strokes` 逐笔渲染自行生成，不能假装有现成分解数据。

### 2.2 覆盖情况与离线加载

- 共 **9575** 个 JSON 文件，覆盖简体常用字。
- 仓库 README 明确：默认会从 jsdelivr CDN 加载；**通过 `npm install hanzi-writer-data` + `charDataLoader` 显式传本地数据即可离线**。
- ✅ 本项目正是采用此方式：字库下载到 `frontend/public/hanzi/` 与 `backend/data/hanzi/`，`charDataLoader` 走本地 fetch，无 CDN 依赖。符合"离线运行"要求。
- 项目内置 43 个预设课文生字；如需其它字，运行 `python backend/scripts/fetch_chars.py <字>` 从上游拉取并落盘。

### 2.3 许可证

- 数据来自 Make Me A Hanzi，源头是 Arphic Technology 1999 年字体，采用 **Arphic Public License (APL)**。
- APL 允许复制、分发、修改，但要求保留版权声明与许可证文本；衍生数据需以相同条款发布。
- ✅ 本项目随附 `ARPHICPL.TXT`（见 `THIRD_PARTY_NOTICES.md`），合规。

### 2.4 可复用能力 vs 需自行实现

| 可复用 | 需自行实现 |
|---|---|
| 9575 字的 strokes/medians 真实数据 | 离线字库下载与校验脚本（已有 `fetch_chars.py`） |
| radStrokes 部首索引 | 缺字检测、笔画数统计 |
| — | 笔画分解图（需按 strokes 逐笔渲染，无现成数据） |
| — | 字库完整性校验（现有测试只抽查了单字） |

---

## 3. Chinese-Stroke-Order-Generator（GIF 导出参考）

### 3.1 真实实现（源码实证）

阅读 `generate.js`（470 行）与 `index.html`、`scripts/smoke-test.js`：

- **流程**：Puppeteer `headless: 'shell'` → 拦截请求只允许 `file/data/about` 协议（强制离线）→ `evaluateOnNewDocument` 注入字库数据 → `writer.animateCharacter()` → 固定间隔截图 → FFmpeg `palettegen/paletteuse` 编码 GIF。
- **默认参数**：画布 500×500、输出 540×540、**15 FPS、固定采集时长 10 秒**（`DEFAULT_CONFIG.totalDuration = 10000`）。
- **批量**：`runWithConcurrencyLimit` 用 worker 池控制并发（默认 3），支持去重、跳过已存在文件、失败汇总。
- **健壮性**：路径穿越防护 `assertDirectChild`、原子写入（先写临时 GIF 再 rename）、清理临时帧、AggregateError 汇总清理失败、smoke test 用 ffprobe + framemd5 验证多帧且帧内容有变化。
- **离线安全**：渲染期间阻断所有 http/https 请求，一旦发生 CDN 访问就报错（第 209-219、249-251 行）。

### 3.2 与我们项目的关键差异（重要）

**参考项目采用"固定 10 秒采集 + 15fps"，这正是本项目刻意规避的设计缺陷**：固定时长会导致笔画多的字被截断、笔画少的字尾部空白，且动画速度与实际书写不符。

本项目采用更优方案（见上一轮修复）：
1. **完成事件驱动**：采到 `onComplete` 才停止，不写死时长；
2. **慢放采集 + 真实时长重采样**：因 Playwright 单帧截图约 77ms 远超 33ms 理论间隔，采集时把动画慢放 `scale` 倍，再按 `真实时长 × fps` 重采样到正确帧数——从根本上解决"导出比预览快 3 倍"的问题；
3. 实测默认参数输出 214 帧、GIF/MP4 时长 7.13s（真实书写 6.04s + 首尾停顿 1.2s），完全吻合。

> 结论：**导出正确性上本项目已超越参考项目**，不采用其固定时长方案。

### 3.3 值得借鉴的工程实践（可落地项）

| 参考项目做法 | 本项目现状 | 建议 |
|---|---|---|
| 拦截 http/https 强制离线 | 靠 route 提供字库，但未主动阻断 CDN | **采纳**：渲染页加请求拦截，杜绝意外 CDN |
| 原子写入（临时文件 + rename） | 直接写最终路径 | **采纳**：避免失败留下损坏文件 |
| `assertDirectChild` 路径穿越防护 | 下载/导出路径来自字符，已有字符校验 | 部分采纳，导出文件名已有 uuid |
| framemd5 验证帧有真实变化 | 目前用像素红值递增验证 | 已等价覆盖 |
| 跳过已存在文件 | 无 | 批量导出可选增强 |

### 3.4 Puppeteer vs Playwright 对比与选型

| 维度 | Puppeteer 25.6（参考项目） | Playwright 1.49（本项目） |
|---|---|---|
| 语言绑定 | Node.js | Python + Node 双绑定，本项目用 Python 版 |
| 集成成本 | 需 Node 侧再维护一套脚本 | **与 FastAPI 同进程 async 调用，无需跨语言**，架构更简洁 |
| 截图能力 | `page.screenshot` + clip | `locator.screenshot`，等价 |
| 请求拦截 | `setRequestInterception` | `page.route`，等价且 API 更简洁 |
| 自动等待 | 手动 `waitForFunction` | `waitForFunction` + 自动等待，等价 |
| 浏览器管理 | 需配置 Chrome Headless Shell | `playwright install chromium` 一条命令 |
| 并发 | worker 池 | 项目已有 asyncio 任务管理器（并发限制 2） |
| 生态与文档 | 成熟 | 成熟，且 Python async 与 FastAPI 天然契合 |

**决策：继续用 Playwright（Python 版），不切换 Puppeteer。** 理由：
1. 本项目后端是 FastAPI（Python），Playwright Python 可在同一 async 事件循环中调用，避免引入 Node 子进程通信；
2. 参考项目的核心采集逻辑我们已实现且更正确（事件驱动 vs 固定时长）；
3. 切换只会增加架构复杂度，无功能收益。
借鉴其"离线拦截、原子写入、批量并发、健壮清理"等工程实践即可。

---

## 4. 技术栈兼容性核对

| 检查项 | 结论 |
|---|---|
| Hanzi Writer 3.x 与 React 18 + TypeScript | ✅ 兼容，本项目已用 `useHanziWriter` hook 封装 |
| `charDataLoader` 返回 Promise | ✅ 官方类型支持，本地异步加载可用 |
| 离线数据 | ✅ 43 字本地字库 + 下载脚本，无 CDN 依赖 |
| Playwright 截图 + FFmpeg 编码 | ✅ 已端到端验证（PNG/GIF/MP4/SVG） |
| Windows 本地运行 | ✅ 已验证；`start.bat` 一键启动 |
| 许可证合规 | ✅ 代码 MIT、数据 APL，分别声明 |

---

## 5. 研究结论与行动项

### 5.1 已确认无需改动的部分
- 动画引擎选型（Hanzi Writer 官方 API）✅
- 逐笔进度实现方式（animateStroke 串联）✅
- 离线字库方案 ✅
- Playwright 导出链路 + 速度修复 ✅
- 许可证声明 ✅

### 5.2 根据研究将落实的增强（写入 TASKS.md）
1. **渲染页请求拦截**：强制离线，阻断意外 CDN 访问（借鉴参考项目）。
2. **导出原子写入**：先写临时文件再 rename，避免失败残留损坏文件。
3. **字库完整性校验**：新增脚本校验本地字库 `strokes/medians/radStrokes` 结构与数量一致性。
4. **笔画分解图数据说明**：在文档明确"无现成 decomposition 字段，分解图由 strokes 渲染"，避免误导。

### 5.3 明确不采纳的做法
- ❌ 固定 10 秒采集时长（会导致截断/速度失真）——本项目事件驱动方案更优。
- ❌ 已废弃的 `strokeAnimationDuration` API——用 `strokeAnimationSpeed`。
- ❌ 切换 Puppeteer——Playwright 与 FastAPI 同语言集成更简洁。

---

## 附录：关键源码位置索引

- 单笔时长公式：`references/hanzi-writer/src/characterActions.ts` 第 88-90 行
- SVG dashoffset 绘制：`references/hanzi-writer/src/renderers/svg/StrokeRenderer.ts` 第 55-70 行
- 废弃 API 换算：`references/hanzi-writer/src/HanziWriter.ts` 第 478-480 行
- 动画方法签名（无 onProgress）：`references/hanzi-writer/src/HanziWriter.ts` 第 174-220 行
- 离线请求拦截：`references/Chinese-Stroke-Order-Generator/generate.js` 第 209-219 行
- 固定时长采集（不采纳）：同上第 293-307 行
- 批量并发：`同上` 第 368-396 行
- 字库数据结构：`references/hanzi-writer-data/data/烧.json`
