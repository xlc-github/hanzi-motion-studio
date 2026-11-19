# ARCHITECTURE — HanziMotion Studio

> 系统架构设计文档
> 版本 v1.1 ｜ 日期 2026-11-19 ｜ 配套 PRD.md / docs/OPEN_SOURCE_RESEARCH.md
> v1.1 更新：开源项目研究结论、导出速度修复、请求拦截与原子写入增强

---

## 1. 架构总览

采用**前后端分离 + 本地单体部署**架构。前端负责编辑与实时预览；后端负责字节级渲染导出（Playwright + FFmpeg）与数据持久化。两者通过 REST API 通信，生产模式下由 FastAPI 托管 Vite 构建产物，实现"一个命令本地启动"。

```
┌─────────────────────────────────────────────────────────┐
│                    浏览器 (React SPA)                     │
│  ┌──────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ 左侧栏    │  │ 中间画布        │  │ 右侧栏            │  │
│  │ 输入/列表 │  │ HanziCanvas    │  │ 样式/动画/导出配置│  │
│  │ 项目历史  │  │ 播放控制        │  │                  │  │
│  └────┬─────┘  └───────┬────────┘  └────────┬─────────┘  │
│       │                │                     │            │
│       └──────── Zustand Store ───────────────┘            │
│                        │                                  │
│                 离线字库 (public/hanzi)                     │
└────────────────────────┬──────────────────────────────────┘
                         │ REST (localhost:8100)
┌────────────────────────▼──────────────────────────────────┐
│                  FastAPI 后端 (Python)                      │
│  ┌───────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │ API 层     │  │ Service 层    │  │ 数据层            │   │
│  │ /api/*    │→ │ 渲染/导出/项目 │→ │ SQLite + 字库文件 │   │
│  └───────────┘  └──────┬───────┘  └───────────────────┘   │
│                         │                                  │
│        ┌────────────────┼────────────────┐                 │
│        ▼                ▼                ▼                 │
│   Playwright        FFmpeg          SQLite               │
│  (Chromium 逐帧)   (GIF/MP4 编码)   (项目/模板/记录)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 技术栈选型与理由

| 层 | 技术 | 选型理由 |
|---|---|---|
| 构建 | Vite + React + TS | 冷启动快、类型安全、生态成熟 |
| 样式 | Tailwind + shadcn/ui | 快速搭建专业编辑器 UI，组件可定制不锁定 |
| 状态 | Zustand | 轻量、无 Provider 包裹、适合跨三栏共享编辑状态 |
| 动画 | Hanzi Writer | **唯一真实 SVG 笔顺动画开源库**，API 已逐条核实 |
| 字库 | hanzi-writer-data | 与 Hanzi Writer 配套，可离线加载，数据为真实 SVG |
| 后端 | FastAPI + Pydantic | 异步支持好、数据校验强、易与 Python 渲染生态集成 |
| 渲染 | Playwright + Chromium | 无头浏览器逐帧截取 SVG 动画，保证与预览一致 |
| 编码 | FFmpeg | GIF/MP4(H.264) 编码事实标准，本机已装 9.0.2 |
| 存储 | SQLite | 零配置本地持久化，适合单用户桌面场景 |

---

## 3. 目录结构

```
hanzi-motion-studio/
├── README.md                      # 启动命令与使用说明
├── PRD.md                         # 产品需求文档
├── ARCHITECTURE.md                # 本架构文档
├── TASKS.md                       # 分阶段任务清单
├── THIRD_PARTY_NOTICES.md         # 开源许可证声明
├── start.bat                      # Windows 一键启动脚本
├── docs/
│   └── OPEN_SOURCE_RESEARCH.md    # ★ 开源项目研究报告
├── references/                    # 三个开源仓库克隆(仅供分析)
│
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts             # 含 /api 代理到后端
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/
│   │   └── hanzi/                 # 本地笔画数据(JSON)，离线加载
│   │       ├── 烧.json
│   │       └── ...
│   ├── render.html                # 后端 Playwright 加载的渲染页入口
│   └── src/
│       ├── render-entry.ts        # ★ 渲染页逻辑(慢放采样/时长接口)
│       ├── main.tsx
│       ├── App.tsx                # 三栏布局骨架
│       ├── index.css
│       ├── types/index.ts         # 全局类型定义
│       ├── store/useStudioStore.ts# Zustand 状态中心
│       ├── lib/
│       │   ├── hanziLoader.ts     # charDataLoader：本地优先 + CDN 回退
│       │   ├── textUtils.ts       # 去标点/去重/提取汉字
│       │   ├── templates.ts       # 四套默认模板
│       │   └── utils.ts           # cn() 等工具
│       ├── hooks/
│       │   └── useHanziWriter.ts  # 封装 Hanzi Writer 实例与播放控制
│       ├── components/
│       │   ├── ui/                # shadcn/ui 基础组件
│       │   ├── HanziCanvas.tsx    # ★ 可复用动画画布组件
│       │   ├── GridOverlay.tsx    # 田字格/米字格 SVG 覆盖层
│       │   ├── LeftPanel.tsx      # 输入 + 卡片列表 + 项目
│       │   ├── CenterStage.tsx    # 画布 + 播放控制 + 进度
│       │   ├── RightPanel.tsx     # 样式 + 动画 + 导出配置
│       │   ├── PlaybackControls.tsx
│       │   └── ExportQueue.tsx    # 底部任务队列
│       └── api/client.ts          # 后端 API 调用封装
│
└── backend/
    ├── requirements.txt
    ├── main.py                    # FastAPI 入口 + 静态托管
    ├── app/
    │   ├── __init__.py
    │   ├── core/config.py         # 配置(并发数/路径/尺寸白名单)
    │   ├── db/database.py         # SQLite 连接与初始化
    │   ├── models/schemas.py      # Pydantic 请求/响应模型
    │   ├── api/
    │   │   ├── chars.py           # 字库查询/校验
    │   │   ├── export.py          # 导出任务 API
    │   │   └── projects.py        # 项目/模板/历史 CRUD
    │   └── services/
    │       ├── char_data.py       # 字库读取与校验
    │       ├── render_capture.py  # ★ Playwright 逐帧采集(慢放+重采样+请求拦截)
    │       ├── encoder.py         # ★ FFmpeg GIF/MP4 编码 + PNG/SVG 导出
    │       └── task_manager.py    # ★ 并发限制 + 进度 + 重试
    ├── data/hanzi/                # 后端字库副本(供渲染页加载)
    ├── scripts/
    │   ├── fetch_chars.py         # 字库下载
    │   └── verify_char_data.py    # ★ 字库完整性校验
    ├── storage/exports/           # 导出产物(原子写入)
    └── tests/                     # pytest 测试
```

---

## 4. 核心数据流

### 4.1 编辑流（前端闭环，低延迟）

1. 用户在左侧输入 → `textUtils` 清洗去重 → 写入 Zustand `chars[]`。
2. `hanziLoader` 通过 `charDataLoader` 从 `public/hanzi/{char}.json` 加载数据。
3. `HanziCanvas` 依据 `useHanziWriter` hook 创建 writer 实例并渲染。
4. 右侧改样式 → 更新 Zustand `style` → `HanziCanvas` 通过 `writer.updateColor()` / 重建实例 应用 → 实时预览。

### 4.2 导出流（前后端协作，保证一致性）

> **一致性根因**：预览与导出必须跑**同一套 Hanzi Writer 配置 + 同一份字库数据**。因此导出不是"另写一套绘制逻辑"，而是让后端 Playwright 打开前端构建出的**同一个渲染页**，注入与预览相同的参数，逐帧采集。

```
前端提交导出参数(字符+样式+动画+尺寸)
        ↓
后端创建任务 → TaskManager(并发=2)
        ↓
Playwright 打开 render.html?char=X&params=...
        ↓ 注入与预览完全相同的 writer options
逐帧采集：requestAnimationFrame 驱动，onComplete 停止
        ↓ 得到帧序列 PNG（帧数 = 真实动画帧数，非固定时长）
FFmpeg 编码：
   GIF  → palettegen/paletteuse（真彩→索引色）
   MP4  → libx264 + yuv420p（H.264，PPT 兼容）
        ↓
产物落盘 → 返回下载 URL → 前端队列显示进度
```

**关键实现点 M4-11（防截断）**：采集循环以 Hanzi Writer 的 `onComplete` 为终止条件，而非定时器。复杂字笔画多 → 采集帧多 → 视频自然更长。FFmpeg 用 `-framerate` + 帧序列输入，时长由帧数决定，杜绝写死时长。

---

## 5. 关键技术设计

### 5.1 HanziWriter 集成（真实 API，已核实）

```ts
// 创建（离线数据优先）
const writer = HanziWriter.create(container, char, {
  width: size, height: size, padding,
  showOutline: true, showCharacter: false,
  strokeColor: style.strokeColor,
  outlineColor: style.outlineColor,
  highlightColor: style.highlightColor,
  strokeAnimationSpeed: anim.speed,      // 默认 1，>0
  delayBetweenStrokes: anim.strokeGap,    // ms，默认 1000
  delayBetweenLoops: anim.loopGap,        // ms，默认 2000
  charDataLoader: (c) => loadLocalCharData(c), // 本地优先
  onLoadCharDataError: () => setMissing(c),
});
```

已核实的可用方法（全部真实存在）：
`animateCharacter({onComplete})`、`animateStroke(n, {onComplete})`、`loopCharacterAnimation()`、`showCharacter()`、`hideCharacter()`、`showOutline()`、`hideOutline()`、`setCharacter()`、`updateColor(name, val)`、`pauseAnimation()`、`resumeAnimation()`、`highlightStroke(n)`。

### 5.2 逐笔状态编排（M2-3 / M2-4）

官方无"跳到第 n 笔并显示之前所有笔"的单一 API，采用**状态重放**策略：

```
Zustand: currentStroke (0-based), totalStrokes
- 点击"下一笔" → currentStroke+1 → replayTo(currentStroke)
- 点击"上一笔" → currentStroke-1 → replayTo(currentStroke)

replayTo(n):
  1. writer.hideCharacter({duration:0})    // 清空已写
  2. writer.showOutline({duration:0})      // 保留浅灰轮廓
  3. for i in 0..n: writer.animateStroke(i) // 顺序重放到第 n 笔
```

> 重放成本为 O(n)，但汉字笔画通常 ≤ 30，实测可忽略。这保证了"当前笔/已完成笔/未写轮廓"三态准确，且不依赖任何不存在的 API。

### 5.3 练字格覆盖层（GridOverlay）

Hanzi Writer 只绘制字形，不绘制练字格。练字格用**独立 SVG 覆盖层**实现，位于字形 canvas 下层（或上层半透明），与字形共用同一坐标系：

- 田字格：外框 + 水平中线 + 垂直中线（虚线）。
- 米字格：田字格 + 两条对角线（虚线）。
- 无：不渲染。
- 颜色/线宽由 style 驱动。

这样练字格与字形解耦，导出时同样叠加，保证一致。

### 5.4 本地字库加载（charDataLoader）

```ts
async function loadLocalCharData(char: string) {
  try {
    const res = await fetch(`/hanzi/${encodeURIComponent(char)}.json`);
    if (!res.ok) throw new Error('local miss');
    return await res.json();              // { strokes: [...], medians: [...] }
  } catch {
    return fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2/${char}.json`)
      .then(r => r.json());                // 在线回退
  }
}
```

数据格式：`{ strokes: string[]（SVG path）, medians: number[][][]（中线）, radStrokes: number[]（部首笔画索引）}`。
离线覆盖策略：`scripts/fetch_chars.py` 预下载预设课文生字（当前 43 字）；`scripts/verify_char_data.py` 校验本地字库完整性。
> 说明：前端预览的 loader 保留 CDN 作为兜底（本地字库缺字时）；但**导出链路（渲染页）已通过请求拦截强制离线**，绝不访问 CDN，保证导出可复现。字库无现成 `decomposition` 字段，笔画分解图需按 `strokes` 逐笔渲染生成。

### 5.5 导出渲染模块（render_capture.py）

- 后端启动 Playwright `async_playwright()`，复用单个 Chromium 实例。
- 每次导出打开新 page，URL 带参数（字符、样式、动画、尺寸、**慢放系数 scale**）。
- 渲染页（`render-entry.ts`，独立 Vite 入口 `render.html`）暴露 `window.__hm`：
  - `start()`: 调 `writer.animateCharacter()`，记录开始时间。
  - `isDone()` / `getDurationMs()`: 动画完成标志 / 真实书写时长。
  - 截图机制：把 `#stage` DOM 序列化为 SVG `foreignObject`（含字形 SVG + 练字格 SVG），由 Playwright `locator.screenshot()` 截取为 PNG——保留矢量清晰度，且与预览同源。
- **请求拦截**：渲染时阻断一切外部 http/https（含 CDN），字库由 `page.route('**/hanzi/*')` 从后端本地返回，强制离线。
- **慢放采样 + 时间轴重采样（关键，见 5.9）**：因单帧截图约 77ms 远超理论帧间隔，采集时把动画慢放 `scale≈ceil(0.085×fps)` 倍以采到足够画面，再按 `目标帧数 = 真实时长 × fps` 均匀重采样。
- 帧交给编码器（encoder.py）编码，产物经临时文件原子写入导出目录。

### 5.9 导出速度一致性修复（重要设计决策）

**问题**：早期导出动画比预览快约 3.3 倍。根因经定量测量确认：Playwright 单帧截图耗时约 77ms，远大于 30fps 的理论帧间隔 33ms；按原速采集只能采到约 54 帧（理论需 180 帧），却仍按固定 30fps 编码，导致 6 秒动画被压成 1.8 秒。

**方案**（渲染页 + 采集端协同）：
1. 采集慢放：`strokeAnimationSpeed = anim.speed / scale`、`delayBetweenStrokes = anim.strokeGap × scale`，把动画时间轴整体拉长。
2. 渲染页 `getDurationMs()` 返回 `elapsed / scale`，即用户设定速度下的真实书写时长。
3. 采集后按 `目标帧数 = 真实时长(ms)/1000 × fps` 用 `_resample_uniform()` 均匀重采样（不足复用、过多抽取）。
4. 按 fps 编码 → 输出时长 = 真实书写时长 + 首尾停顿。

**验证**：默认参数输出 214 帧、GIF/MP4 时长 7.13s（真实书写 6.04s + 首尾停顿 1.2s），完全吻合。
**注意**：修改 `render-entry.ts` 后必须 `npm run build` 重新打包 `dist/` 才生效（渲染页走构建产物）。

### 5.6 FFmpeg 编码（encoder.py）

```bash
# GIF（高质量调色板）
ffmpeg -framerate FPS -i frame_%05d.png -filter_complex \
  "split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer" \
  -loop LOOP output.gif

# MP4（H.264，PPT 兼容 yuv420p）
ffmpeg -framerate FPS -i frame_%05d.png -c:v libx264 -pix_fmt yuv420p \
  -movflags +faststart -crf 20 output.mp4
```

首尾停顿：在采集阶段于动画前后各插入 N 帧静止帧（而非在 FFmpeg 里补时长），保证 GIF/MP4 行为一致。

### 5.7 任务管理器（task_manager.py）

- `asyncio.Semaphore(2)` 限制并发（配置化）。
- 任务状态机：`pending → running → done | failed`，记录 progress(0-100)。
- 失败保留 error 信息；前端任务队列提供重试按钮，按 `task.kind` 分别重派发（single / bundle / decompose）。
- 轮询 `/api/export/tasks/{id}` 推送进度（简单可靠）。

### 5.8 数据模型（SQLite）

| 表 | 字段 |
|---|---|
| `projects` | id, name, chars(JSON), created_at, updated_at |
| `templates` | id, name, style_json, anim_json, builtin, created_at |
| `export_records` | id, chars(JSON), format, params_json, output_path, status, created_at |

### 5.10 批量打包与分解图（阶段七）

- **ZIP 批量**（`zip_bundle.py`）：`bundle_export` 把每个字渲染为独立文件（复用 `_render_file`），汇总后 `build_zip` 用 `zipfile.ZIP_DEFLATED` 一次性打包；中间单字文件打包后删除，ZIP 原子写入（`.zip` 临时名 + rename）。前端 `kind: bundle` 只触发一次浏览器下载。旧 `/api/export/batch`（逐字）保留兼容。
- **分解图**（`decompose.py`）：因字库无现成 decomposition 字段，按 `strokes` 自渲染。第 i 步 = 已写笔（前 i-1 笔）用 `strokeColor` 实心、当前笔（第 i 笔）用 `highlightColor` 强调（`emphasizeDecomposeStroke` 可关）、其余用 `outlineColor`；总览把各步内嵌为网格 `<svg>` 并标"第N步"。SVG 直接输出矢量；PNG 用 Playwright 加载 SVG 后对 `<svg>` 元素截图（`omit_background`）。"水"4 笔经视觉核对递进正确。
- **序号标注**（借鉴 hanzistroke.com 教学设计）：`_stroke_number_badge()` 取当前笔 `medians[i][0]` 起点，按字形同款变换 `x=t+mx·scale, y=ty-my·scale` 换算到 1024 画布坐标，在字形 `<g>` **之外**叠加红圈白字序号（避免被 `scale(s,-s)` 的 Y 翻转倒置），并 clamp 在画布内防裁切；`showStrokeNumbers` 可关，medians 缺失时自动降级为不标注。前端 `HanziCanvas` 同步在画布左上角渲染当前笔序号徽章（读 Zustand `currentStroke`），`RightPanel`「样式」面板两个开关控制，默认值写入 `StyleConfig`（前后端 + 内置模板 + 渲染页）。

### 5.10b 教学素材三件套（前端静态渲染，阶段七补强）

- **共用基础**：`useCharData(char)` hook 异步加载完整 CharData（strokes/medians/radStrokes，走 loader 内存缓存）；`StrokeStepSvg` 前端复刻后端 `decompose._step_svg` 的坐标系与配色（三色笔画 + 序号圈 + 可选田字格），供分解墙与练习页复用。字库坐标 `x:0→1024, y:-124→900` 用 `translate(t,ty) scale(s,-s)` 翻转（t=(1-s)·512, ty=900s+t）；序号圆在字形 `<g>` 外绘制防 Y 翻转倒置。
- **笔顺分解墙**（`StrokeGridPanel`）：每笔一个 `StrokeStepSvg` 小格，网格排列；点击 → store 新增 `jumpToStroke` 命令（playbackCmd.type='jump' + stroke），`HanziCanvas` 消费后调 `hw.replayToStroke(n)` 定位画布。
- **笔顺路径图**（`StrokePathPanel`）：medians 轨迹点按同款变换算 SVG 坐标，`<polyline>` 虚线沿运笔方向；起笔点画编号圆（clamp 画布内）；浅灰 strokes 作底 + 三项图例。
- **A4 练习页**（`PracticeSheetPanel`）：自包含整页 SVG（794×1123），范字→逐笔分解→描红空格三段；每格用嵌套 `<svg viewBox="0 0 1024 1024">` 建立独立坐标系（内部换算与 StrokeStepSvg 一致，避免手动缩放误差）。三种输出：① 打印——新窗口注入 SVG + `@page{size:A4;margin:0}`；② SVG——`XMLSerializer` 序列化下载；③ **PDF**——见 5.10c。
- **布局**：`CenterStage` 改为可滚动纵向布局——核心预览（画布 + 字形数据卡并排）+ 播放控制 + 教学素材 Tabs（三块切换，避免一次铺开拥挤）。窄屏下画布与数据卡自动堆叠。核心预览画布通过 `HanziCanvas` 的 `sizeOverride={340}` 固定显示为 340px（仅屏幕预览），导出仍读 store 的 `canvas.size`，二者解耦；标题/卡片/间距同步收紧，避免中央区过大。

### 5.10b-2 字形数据卡 v2（客观指标 + 交互联动）

- **单一数据源**：`CenterStage` 的 `useCharData` 加载完整 CharData 后同时喂给画布预览、信息卡与三个素材面板，信息卡不再读 `CharItem` 的异步缓存值（修复切字瞬间数字与画布不同步）。
- **可靠派生**（`lib/charMetrics.ts`）：逐笔长度 = median 相邻采样点距离之和；轨迹总长 = 各笔长度和；字形比例 = medians 包围盒宽高比（>1.15 偏宽 / <0.85 偏高 / 否则近方正）。均为客观几何量，可独立验证。
- **交互联动**：迷你字形图用与 `StrokeStepSvg` 一致的 `translate(t,ty) scale(s,-s)` 变换渲染，点击可 toggle 部首笔画高亮（`radStrokes` 索引用 `highlightColor`，其余转 `outlineColor`）；逐笔长度条点击调 `jumpToStroke(i+1)` 定位主画布。
- **明确不做**（实测验证后排除）：笔画类型（横竖撇捺）——几何分类对「人」「水」等字大量误判；独体/合体结构——`radStrokes` 只是部首笔画索引，「上/中/云」会被误判。二者放进数据卡会误导教师，故只呈现客观统计；完整数据来源说明收进 title 属性，不占主视觉。
- **纯离线**：`hanziLoader.ts` 移除 jsdelivr CDN 回退，仅本地字库（9534 字），与「离线可用」承诺及后端 `render_capture` 的外部请求阻断策略一致。
- **无障碍**：播放按钮补 `aria-label`，循环按钮补 `aria-pressed`，笔画进度条加 `role=progressbar` + `aria-valuenow/valuetext`，画布加 `role=img` 语义描述。

### 5.10c 练习页 PDF 导出（阶段七补强）

- **设计**：SVG 是唯一真相源——前端把已渲染的 A4 练习页 SVG（`XMLSerializer` 序列化，`width="100%"` 换成固定 794×1123）POST 到 `POST /api/export/practice-pdf`，后端不重复实现布局，保证 PDF 与屏幕预览完全一致（所见即所得）。
- **后端**（`services/practice_pdf.py` + `api/export.py`）：复用全局 Chromium（`get_browser`），`set_content` 注入包装 HTML（`@page{size:A4;margin:0}` + svg 强制 210mm×297mm），`page.pdf(format='A4', print_background=True, margin=0)` 输出矢量 PDF；`page.route` 阻断一切外部请求保持离线。实测嵌入 `MicrosoftYaHei` 中文字体（CIDFont/Type0），中文清晰无乱码。
- **任务链**：走既有异步任务体系（`PracticePdfRequest` schema → `task_manager` → 轮询 → `download/{file}`），前端 `dispatchPracticePdf` + `kind='pdf'`/`pdfContext`（含 SVG）支持队列追踪与失败重试；`ExportQueue` 对 pdf 类型显示「练习页PDF」标签。PDF 与 SVG/打印同源，均自动触发下载并可在队列重复下载。
- **取舍依据**：参考站 hanzistroke.com 的部件分解/组词/HSK/例句依赖拼音·释义·分级·语料数据，本地字库无此类字段且定位错位（HSK 面向汉语学习者），故不集成；练习页是唯一可零数据复刻的高价值模块。

### 5.11 容器化部署

- 多阶段 `Dockerfile`：Stage1 `node:22-alpine` 执行 `npm ci && npm run build`；Stage2 `python:3.13-slim` + `ffmpeg` + `fonts-noto-cjk`（总览中文标注）+ `playwright install --with-deps chromium`，复制后端与前端 dist。
- 后端 `main.py` 在 dist 存在时把 `/` 挂到静态目录，因此**单容器单端口 8100** 同时提供 UI 与 API，无跨域/代理。
- `docker-compose.yml` 用命名卷 `studio_storage` 持久化 `/app/backend/storage`（SQLite + 导出产物）。本机 `docker compose config` 校验通过；因 Docker daemon 未启动未实测构建。

---

## 6. API 设计（REST）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/chars/available` | 返回本地字库所含字符列表 |
| POST | `/api/chars/validate` | 批量校验哪些字有笔画数据 |
| GET | `/api/chars/{char}/data` | 返回单字 SVG 数据 |
| POST | `/api/export/gif` | 创建 GIF 导出任务（异步，返回 taskId） |
| POST | `/api/export/mp4` | 创建 MP4 导出任务 |
| POST | `/api/export/png` | 创建 PNG 导出任务 |
| POST | `/api/export/svg` | 创建 SVG 导出任务 |
| POST | `/api/export/batch` | 批量导出（逐字独立任务，兼容保留） |
| POST | `/api/export/bundle` | **批量导出打包为单个 ZIP**（`BundleExportRequest`）|
| POST | `/api/export/decompose` | **笔画分解图**（逐步图 + 总览，PNG/SVG → ZIP）|
| GET | `/api/export/tasks` | 任务列表与进度 |
| GET | `/api/export/tasks/{id}` | 单任务状态（含 downloadUrl） |
| GET | `/api/export/download/{file}` | 下载产物 |
| CRUD | `/api/projects` | 生字项目（GET/POST/PUT/DELETE） |
| CRUD | `/api/templates` | 自定义模板（GET/POST/DELETE） |
| GET/DELETE | `/api/history` | 导出历史（`DELETE /api/history/{id}`） |

---

## 7. 关键设计决策记录（ADR 摘要）

| 决策 | 选择 | 理由 |
|---|---|---|
| 逐笔定位如何实现 | 状态重放 `animateStroke(0..n)` | 官方无跳转 API，重放最稳、笔画少无性能问题 |
| 导出如何与预览一致 | 后端复用同一渲染页逐帧采集 | 避免两套绘制逻辑产生偏差 |
| 导出时长如何确定 | 由 `onComplete` + 帧数决定 | 根治复杂字被固定时长截断 |
| 练字格如何实现 | 独立 SVG 覆盖层 | 与字形解耦，预览/导出共用 |
| 并发控制 | asyncio.Semaphore(2) | 防止多 Chromium/FFmpeg 打爆资源 |
| 持久化 | SQLite | 零配置，符合本地单用户场景 |
| 进度推送 | 第一阶段轮询 | 实现简单可靠，够用 |
| 导出时长确定（v1.1 修订） | 慢放采样 + 真实时长重采样 | 截图慢导致帧数不足，固定 fps 编码会加速；重采样根治 |
| 逐笔进度跟踪 | animateStroke 串联 + 状态管理 | 官方 animateCharacter/animateStroke 无 onProgress 回调 |
| 浏览器自动化选型 | Playwright Python（非 Puppeteer） | 与 FastAPI 同事件循环，无需跨语言，架构更简洁 |
| 导出文件写入 | 临时文件 + rename 原子发布 | 编码失败不留损坏文件 |
| 渲染页网络 | 阻断外部请求，字库本地注入 | 强制离线，隔离 CDN 依赖 |
| 批量下载方式 | 后端打包 ZIP + 浏览器一次下载 | 避免逐字弹窗；中间文件即删 |
| 分解图实现 | 按 strokes 自渲染（前 n 笔实心） | 字库无现成 decomposition，必须自研 |
| 资料库持久化 | SQLite + 前端左侧「资料库」Tab | 复用已有 CRUD，无新增后端表 |
| 部署形态 | 单容器单端口（FastAPI 托管 dist） | 免跨域/代理，`docker compose up` 即用 |

---

## 8. 开源项目研究结论（详见 docs/OPEN_SOURCE_RESEARCH.md）

克隆并实读三个仓库后确认：

| 项目 | 可复用 | 不采纳 / 需自研 |
|---|---|---|
| hanzi-writer | 逐笔动画算法、SVG/Canvas 渲染器、颜色 API、charDataLoader | 逐笔进度（官方无 onProgress，自研 animateStroke 串联） |
| hanzi-writer-data | 9575 字真实 strokes/medians/radStrokes | 无现成 decomposition，分解图需自渲染；字库校验脚本自研 |
| Chinese-Stroke-Order-Generator | 离线请求拦截、原子写入、批量并发、健壮清理的工程实践 | 固定 10s 采集（会截断/失真，不采纳）；Puppeteer（用 Playwright 替代）；废弃的 strokeAnimationDuration API |

许可证：Hanzi Writer 代码 MIT、笔画数据 Arphic Public License（两者不同，已分别声明）；参考项目原创代码 MIT。

---

## 9. 风险与缓解

| 风险 | 缓解措施 |
|---|---|
| 部分汉字无笔画数据 | 前端标记 + 后端校验，跳过并提示，不阻塞 |
| Hanzi Writer CDN 不可达 | 本地字库优先，离线可用 |
| 复杂字导出帧数多、体积大 | 帧目录任务结束即清理；GIF 用 diff 调色板优化 |
| FFmpeg 编码失败 | 任务状态 failed + 保留 error + 重试入口 |
| Windows 路径中文字符 | 全链路 UTF-8，文件名用字符+序号，编码层统一 |
| Chromium/FFmpeg 缺失 | 启动自检脚本给出安装指引（已确认本机齐备） |

---

## 10. 许可证合规

- Hanzi Writer：MIT — 随产品附带 LICENSE。
- hanzi-writer-data：Arphic Public License — 随产品附带数据许可声明。
- 详见 `THIRD_PARTY_NOTICES.md`。
