import type { StyleConfig, AnimConfig, Template } from '@/types'

/** 标准样式（模板 A 基线） */
export const DEFAULT_STYLE: StyleConfig = {
  grid: 'tian',
  gridColor: '#C0392B',
  gridLineWidth: 1,
  background: '#FDF9F0',
  transparent: false,
  strokeColor: '#C0392B',
  outlineColor: '#D8D3C8',
  highlightColor: '#E8A33D',
  glyphScale: 0.82,
  padding: 20,
  borderRadius: 0,
  highlightFirstStroke: false,
  highlightCurrentStroke: true,
  showStrokeNumbers: true,
  emphasizeDecomposeStroke: true,
}

/** 标准动画参数 */
export const DEFAULT_ANIM: AnimConfig = {
  speed: 1,
  strokeGap: 280,
  loopGap: 1200,
  loop: false,
  headPause: 400,
  tailPause: 800,
  fps: 30,
}

/** 四套内置模板 */
export const BUILTIN_TEMPLATES: Template[] = [
  {
    id: 'tpl-a',
    name: '标准小学语文田字格',
    description: '米白背景、红色笔画，最通用的教学样式',
    builtin: true,
    style: {
      ...DEFAULT_STYLE,
      grid: 'tian',
      gridColor: '#C0392B',
      background: '#FDF9F0',
      strokeColor: '#C0392B',
      transparent: false,
    },
    anim: { ...DEFAULT_ANIM },
  },
  {
    id: 'tpl-b',
    name: '米字格教学',
    description: '浅灰网格、深红笔画，适合结构讲解',
    builtin: true,
    style: {
      ...DEFAULT_STYLE,
      grid: 'mi',
      gridColor: '#B8B8B8',
      background: '#F5F5F5',
      strokeColor: '#8E2B2B',
      outlineColor: '#CCCCCC',
      transparent: false,
    },
    anim: { ...DEFAULT_ANIM },
  },
  {
    id: 'tpl-c',
    name: '清新绘本风',
    description: '奶油底色、草绿笔画、圆角卡片',
    builtin: true,
    style: {
      ...DEFAULT_STYLE,
      grid: 'tian',
      gridColor: '#A8C9A0',
      background: '#FFF8E7',
      strokeColor: '#4A8B5C',
      outlineColor: '#D5E6D2',
      borderRadius: 24,
      transparent: false,
    },
    anim: { ...DEFAULT_ANIM, speed: 0.9 },
  },
  {
    id: 'tpl-d',
    name: 'PPT 透明背景',
    description: '无网格、透明背景、深色笔画，直接插入课件',
    builtin: true,
    style: {
      ...DEFAULT_STYLE,
      grid: 'none',
      background: '#000000',
      strokeColor: '#2C2C2C',
      outlineColor: '#C8C8C8',
      transparent: true,
      borderRadius: 0,
    },
    anim: { ...DEFAULT_ANIM },
  },
]

export function getTemplate(id: string): Template | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id)
}
