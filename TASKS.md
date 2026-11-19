# TASKS — HanziMotion Studio 开发任务清单

> 规格驱动开发进度主线。每完成一项勾选 `[x]`，未开始 `[ ]`，进行中 `[~]`。
> 每阶段完成后：运行测试 → 修复问题 → 更新本文件 → 说明完成情况 → 给出下一阶段建议。

---

## 阶段一：项目分析与规划 ✅ 已完成

- [x] 检查当前工作目录与开发环境
  - [x] Node.js v22.22.2 / npm 10.9.7
  - [x] Python 3.13.12（用 `python -m pip` 安装依赖；全局 `pip` 指向 miniconda 3.10 需避开）
  - [x] FFmpeg 9.0.2（含 libx264 / libwebp / libvpx）
  - [x] Git 2.55.0
- [x] 核对 Hanzi Writer API（逐条确认，全部真实存在）
  - [x] `animateCharacter()` / `animateStroke(n)` / `loopCharacterAnimation()`
  - [x] `showCharacter` / `hideCharacter` / `showOutline` / `hideOutline`
  - [x] `setCharacter` / `updateColor` / `pauseAnimation` / `resumeAnimation` / `highlightStroke`
  - [x] 完整 options 与默认值；`charDataLoader` 离线加载方式
  - [x] 许可证：代码 MIT，数据 Arphic Public License
- [x] 生成 PRD.md / ARCHITECTURE.md / TASKS.md / THIRD_PARTY_NOTICES.md

## 阶段二：初始化项目（Phase 1）✅ 已完成

### 前端初始化
- [x] 初始化 Vite + React + TypeScript 项目
- [x] 安装 Tailwind CSS 并配置主题（米白/柔绿主色）
- [x] 手写 shadcn/ui 风格基础组件（Button/Input/Textarea/Label/Slider/Switch/Tabs/Card/Select）
- [x] 安装 Zustand 并建立 `useStudioStore`
- [x] 安装 hanzi-writer 3.7.3，配置本地数据加载器
- [x] 配置 `/api` 代理到后端 8100（因 8000 被占用）

### 后端初始化
- [x] 建立 FastAPI 项目骨架（main.py + app 包结构）
- [x] 编写 requirements.txt 并安装全部依赖
- [x] 配置 SQLite 数据库与启动初始化（projects/templates/export_records 三表）
- [x] 实现健康检查 `/api/health`

### 字库与 UI 骨架
- [x] 下载 43 个汉字笔画数据到前后端本地字库
- [x] 实现 `charDataLoader` 本地优先 + CDN 回退 + 内存缓存
- [x] 搭建三栏布局 + 底部队列骨架
- [x] 验证前后端均可启动、健康检查通过

**阶段二验收**：✅ 前端 build 通过；后端 `/api/health` OK；字库 43 字齐全。

## 阶段三：单字动画 MVP（Phase 2）✅ 已完成

- [x] 实现 `useHanziWriter` hook（逐笔串联播放，精确进度跟踪；重播/暂停/继续/循环）
- [x] 实现 `HanziCanvas` 可复用组件（含逐笔状态重放：上一笔/下一笔）
- [x] 实现汉字输入与清洗（去标点/去重/字库校验）
- [x] 实现汉字卡片列表、拖拽排序、切换、删除、预设课文
- [x] 实现 `GridOverlay` 田字格/米字格/无格 + 格线颜色/粗细
- [x] 实现样式编辑（背景/透明/笔画色/轮廓色/高亮色/字形大小/边距/圆角 + 调色板/颜色选择器/屏幕取色）
- [x] 实现动画参数（速度/笔间停顿/循环间隔/首尾停顿/帧率）
- [x] 实现四套默认模板 + 自定义模板保存
- [x] 实现 PNG 导出（完整字 + 透明背景）
- [x] 实现 GIF 导出（真实逐笔动画 + 首尾停顿，帧数由动画完成事件驱动）
- [x] 验证：单字动画真实、样式实时同步、进度准确、导出可用

**阶段三验收**：✅ 参见测试报告——动画帧序列验证（红像素 12→8332 递增，28 个递增段）、UI 测试进度 4/4、无控制台错误。

## 阶段四：批量与导出中心（Phase 3）✅ 已完成

- [x] 批量输入课文自动提取生字（含去重）
- [x] 一键全选与批量导出（逐字提交汇总进度）
- [x] MP4 导出（H.264 / yuv420p / 帧率可调 / 由帧数决定时长不截断）
- [x] SVG 矢量导出（真实 stroke path，无限放大清晰）
- [x] GIF 导出（palettegen/paletteuse 高质量编码）
- [x] 后端 Playwright 逐帧渲染模块（render_capture.py，内置静态服务器 + 字库拦截）
- [x] FFmpeg 编码模块（encoder.py）
- [x] 任务管理器（并发限制=2 / 进度 / 失败重试）
- [x] 底部导出任务队列 UI（进度 + 下载 + 重试 + 删除）
- [x] 项目/模板/历史记录 SQLite 持久化与 CRUD API
- [x] 文件命名规则统一
- [x] 验证：ffprobe 确认 GIF/MP4 均为 256×256、可播放

**阶段四验收**：✅ API 集成测试全部通过（含真实 PNG/GIF 异步导出 + 历史记录）。

## 阶段五：测试、验收与交付（Phase 4）✅ 已完成

- [x] 校验笔画数据（43 字，结构合法）
- [x] 检查动画实际效果（首帧仅轮廓、中帧部分笔画、末帧完整字的截图核对）
- [x] 验证 GIF/MP4 文件可播放（ffprobe：gif / h264，256×256）
- [x] 测试批量任务与失败重试（任务管理器 + UI 重试按钮）
- [x] 检查 UI 交互（无假按钮，所有控件真实功能）
- [x] 编写 pytest 自动化测试（test_services / test_export_e2e / test_api_integration / test_ui）
- [x] 编写 README（完整启动命令）
- [x] 编写 THIRD_PARTY_NOTICES.md
- [x] 更新本 TASKS.md 为最终状态

**阶段五验收**：✅ 后端单测 6 passed；端到端导出全通过；API 集成全通过；UI 冒烟全通过。

---

## 阶段六：开源项目研究与工程增强（补充要求）✅ 已完成

- [x] 克隆三个开源仓库到 `references/`（浅克隆，不覆盖现有代码）
  - [x] chanind/hanzi-writer 3.0.0（MIT）
  - [x] chanind/hanzi-writer-data 2.0.1（Arphic PL，9575 字）
  - [x] Yark-yao/Chinese-Stroke-Order-Generator 1.0.0（MIT，Puppeteer）
- [x] 实读 README / package.json / 核心源码 / 许可证（非猜测）
  - [x] 确认单笔时长公式 `(笔画长度+600)/(3*speed)`，官方按笔画长度自适应，无需重复实现
  - [x] 确认 SVG 逐笔显现原理（clipPath + stroke-dashoffset + medians mask）
  - [x] **确认官方 `animateCharacter`/`animateStroke` 无 `onProgress` 回调** → 印证本项目逐笔串联方案是唯一正确实现
  - [x] 确认 `strokeAnimationDuration` 已废弃、`strokeAnimationSpeed` 为现行 API → 本项目选型正确
  - [x] 确认字库结构 strokes/medians/radStrokes；**无现成 decomposition 字段**，分解图需自行渲染
  - [x] 确认参考项目用固定 10s 采集 + 15fps（会导致截断/速度失真），本项目事件驱动方案更优
- [x] 对比 Puppeteer 25.6 vs Playwright 1.49 → **决策：继续用 Playwright Python 版**（与 FastAPI 同事件循环，无需跨语言）
- [x] 编写 `docs/OPEN_SOURCE_RESEARCH.md`（可复用能力 / 需自研功能 / 许可证 / 兼容性 / 对比 / 源码索引）

### 工程增强（据研究落实）
- [x] **修复导出动画比预览快约 3 倍的 bug**：根因是截图 77ms >> 理论 33ms 帧间隔导致帧数不足（54 vs 180）却按固定 fps 编码。方案：采集慢放 + 真实时长重采样。修复后默认参数输出 214 帧、GIF/MP4 7.13s，与真实书写 6.04s+停顿吻合。⚠️ 改 render-entry.ts 后必须重新 build dist
- [x] **渲染页请求拦截**：阻断一切外部 http/https（含 CDN），强制离线（借鉴参考项目安全实践）
- [x] **导出原子写入**：先写临时文件（保留正确扩展名供 FFmpeg 识别）再 rename，失败清理临时文件
- [x] **字库完整性校验脚本** `scripts/verify_char_data.py`：校验字段结构、strokes/medians 数量一致、radStrokes 越界；前后端各 43 字 / 363 笔全部通过
- [x] 验证：单测 6 passed、端到端导出全通过、API 集成全通过（含请求拦截 + 原子写入链路）

**阶段六验收**：✅ 研究报告已交付；4 项工程增强均落地并通过全套测试。

## 阶段七：剩余增强项全部完成 ✅ 已完成

- [x] **ZIP 批量打包**：后端新增 `POST /api/export/bundle`（所有字导出后合并为一个 ZIP，原子写入），前端 `dispatchBundle` 一次下载；旧 `/api/export/batch`（逐字）保留兼容
  - [x] 新增 `zip_bundle.py`（原子写入）、`BundleExportRequest` schema
  - [x] 任务队列支持 `kind: bundle`，下载文件名 `hanzi_batch_N字_{fmt}.zip`
- [x] **前端资料库管理面板** `LibraryPanel.tsx`（左侧「资料库」Tab）
  - [x] 生字项目：保存当前生字 / 点击载入 / 删除
  - [x] 我的模板：保存当前样式/动画为模板（落 SQLite）/ 点击应用 / 删除；与内置模板合并展示
  - [x] 导出历史：列表 / 删除 / 一键重新导出（复用历史参数）
  - [x] API 客户端补全 projects/templates/history CRUD；App 启动时 `loadLibrary()`
- [x] **笔画分解图**：后端 `decompose.py` 按真实 strokes 渲染逐步图（前 n 笔实心、其余轮廓）+ 总览图（网格 + "第N步"标注），支持 PNG（Playwright 渲染）/ SVG（矢量），打包 ZIP
  - [x] `POST /api/export/decompose` 路由 + `DispatchDecompose`；任务队列 `kind: decompose`
  - [x] 视觉核对："水"字第1步仅竖钩实心、第3步3笔实心、总览4步递进正确
- [x] **Docker Compose 部署**：多阶段 Dockerfile（Node 构建前端 → Python 运行时含 FFmpeg/Chromium/中文字体）+ docker-compose.yml（单端口 8100 + storage 卷持久化）+ .dockerignore
  - [x] `docker compose config` 语法校验通过；本机 Docker daemon 未启动，未实际构建镜像（环境限制，非配置问题）

**阶段七验收**：✅ 新功能端到端测试全通过（bundle ZIP 内容正确、分解图 5 文件 + 视觉核对、项目/模板/历史 CRUD）；新功能 UI 测试全通过（资料库三分区、保存项目、分解图区块、批量 ZIP 提示、无控制台错误）；单测 6 passed；字库校验通过；前端 build 通过。

---

## 环境检查记录

| 依赖 | 状态 | 版本 | 备注 |
|---|---|---|---|
| Node.js | ✅ | v22.22.2 | 已安装 |
| npm | ✅ | 10.9.7 | 189 个前端包安装成功，0 漏洞 |
| Python | ✅ | 3.13.12 | WorkBuddy 内置；`python -m pip` 用它 |
| FFmpeg | ✅ | 9.0.2 | 含 libx264/libwebp/libvpx |
| ffprobe | ✅ | 9.0.2 | 验证导出文件 |
| Playwright Chromium | ✅ | 已安装 | 逐帧渲染导出 |
| Git | ✅ | 2.55.0 | 已安装 |

## 测试报告摘要

| 测试 | 命令 | 结果 |
|---|---|---|
| 后端单元测试 | `pytest test_services.py` | 6 passed |
| 端到端导出 | `test_export_e2e.py` | PNG/GIF/MP4/SVG 全部生成；ffprobe 验证通过 |
| 动画帧序列验证 | 统计红色像素 | 12→8332 递增，28 个递增段，真实逐笔书写 |
| API 集成 | `test_api_integration.py` | 健康检查/字库/校验/项目 CRUD/模板/历史/PNG/GIF 导出全通过 |
| UI 冒烟 | `test_ui.py` | 三栏渲染/输入/模板切换/播放/进度4/4；无控制台错误 |
| 新功能端到端 | `test_new_features.py` | bundle ZIP（2文件）、分解图 SVG/PNG（各5文件）、项目/模板/历史 CRUD 全通过 |
| 新功能 UI | `test_ui_new_features.py` | 资料库三分区、保存项目、分解图区块、批量 ZIP 提示；无控制台错误 |
| Docker 配置 | `docker compose config` | 语法校验通过（daemon 未启动未实测构建） |

## 变更日志

| 日期 | 阶段 | 说明 |
|---|---|---|
| 2026-11-19 | 阶段一 | 完成环境检查、API 核对、四份 Spec 文档 |
| 2026-11-19 | 阶段二 | 前后端骨架、依赖安装、43 字离线字库、三栏 UI |
| 2026-11-19 | 阶段三 | 单字动画 MVP、逐笔进度、样式编辑、PNG/GIF 导出 |
| 2026-11-19 | 阶段四 | 批量导出、MP4/SVG、任务队列、SQLite 持久化 |
| 2026-11-19 | 阶段五 | 全套自动化测试通过，交付文档完成 |
| 2026-11-19 | 阶段六 | 三开源仓库深度研究；修复导出速度 bug；请求拦截/原子写入/字库校验增强；研究报告交付 |
| 2026-11-19 | 运维 | 项目整体迁移至 `E:/workbuddy_proj/hanzi-motion-studio`；新增 `start.bat` 一键启动 |
| 2026-11-19 | 阶段七 | ZIP 批量打包、资料库管理面板、笔画分解图、Docker Compose 全部完成并通过测试 |
