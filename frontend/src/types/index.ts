/** 全局类型定义 */

/** 单个汉字卡片 */
export interface CharItem {
  /** 汉字本身 */
  char: string
  /** 笔画数（数据加载成功后填充） */
  strokeCount: number
  /** 部首笔画数（源自 radStrokes，无部首则为 0） */
  radStrokeCount: number
  /** 字库数据状态 */
  status: 'pending' | 'ready' | 'missing'
}

/** 辅助格类型 */
export type GridType = 'tian' | 'mi' | 'none'

/** 练字格 / 样式配置 */
export interface StyleConfig {
  grid: GridType
  gridColor: string
  gridLineWidth: number
  background: string
  transparent: boolean
  strokeColor: string
  outlineColor: string
  highlightColor: string
  /** 字形占画布比例 0.5 - 0.95 */
  glyphScale: number
  /** 画布边距 px */
  padding: number
  /** 圆角（绘本风用） */
  borderRadius: number
  /** 首笔高亮 */
  highlightFirstStroke: boolean
  /** 当前笔高亮 */
  highlightCurrentStroke: boolean
  /** 分解图：在当前笔起点标注笔画序号（红色圆圈白字） */
  showStrokeNumbers: boolean
  /** 分解图：当前笔用强调色填充，已写笔用笔画色 */
  emphasizeDecomposeStroke: boolean
}

/** 动画参数配置 */
export interface AnimConfig {
  /** 单笔绘制速度，>0，越大越快（对应 strokeAnimationSpeed） */
  speed: number
  /** 笔间停顿 ms（对应 delayBetweenStrokes） */
  strokeGap: number
  /** 循环间隔 ms（对应 delayBetweenLoops） */
  loopGap: number
  /** 循环播放 */
  loop: boolean
  /** 首尾停顿 ms（导出用） */
  headPause: number
  tailPause: number
  /** 帧率（导出用） */
  fps: number
}

/** 画布尺寸配置 */
export interface CanvasConfig {
  size: 256 | 512 | 1024 | number
  customSize: number
}

/** 导出格式 */
export type ExportFormat = 'gif' | 'mp4' | 'png' | 'svg'

/** 保存到后端的项目 */
export interface Project {
  id: number
  name: string
  chars: string[]
  createdAt: string
  updatedAt: string
}

/** 保存到后端的自定义模板 */
export interface SavedTemplate {
  id: number
  name: string
  style: StyleConfig
  anim: AnimConfig
  builtin: boolean
}

/** 导出历史记录 */
export interface HistoryRecord {
  id: number
  chars: string[]
  format: string
  params: {
    char?: string
    style: StyleConfig
    anim: AnimConfig
    size: number
    loopCount?: number
  }
  outputPath?: string
  status: string
  createdAt: string
}

/** 模板 */
export interface Template {
  id: string
  name: string
  description: string
  style: StyleConfig
  anim: AnimConfig
  builtin: boolean
}

/** Hanzi Writer 字库数据格式 */
export interface CharData {
  strokes: string[]
  medians: number[][][]
  /** 部首笔画索引（可选，独体字通常缺失） */
  radStrokes?: number[]
}

/** 导出任务状态 */
export type TaskStatus = 'pending' | 'running' | 'done' | 'failed'

/** 导出任务 */
export interface ExportTask {
  id: string
  chars: string[]
  format: ExportFormat | 'pdf'
  status: TaskStatus
  progress: number
  error?: string
  downloadUrl?: string
  /** 下载时的文件名（bundle/decompose 为 zip） */
  downloadName?: string
  createdAt: number
  /** 任务种类，决定重试时调用哪个派发器 */
  kind?: 'single' | 'bundle' | 'decompose' | 'pdf'
  /** 重试所需的派发参数 */
  retryContext?: {
    chars: string[]
    format: ExportFormat
    params: { char: string; style: StyleConfig; anim: AnimConfig; size: number }
  }
  /** 分解图重试上下文 */
  decomposeContext?: { char: string; style: StyleConfig; size: number; imageFormat: 'png' | 'svg' }
  /** 练习页 PDF 重试上下文（SVG 为唯一真相源） */
  pdfContext?: { char: string; svg: string }
}
