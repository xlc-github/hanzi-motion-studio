import { create } from 'zustand'
import type {
  CharItem,
  StyleConfig,
  AnimConfig,
  CanvasConfig,
  ExportTask,
  ExportFormat,
  Template,
  Project,
  SavedTemplate,
  HistoryRecord,
} from '@/types'
import { DEFAULT_STYLE, DEFAULT_ANIM, BUILTIN_TEMPLATES } from '@/lib/templates'
import { prefetchChars, getCachedStrokeCount, getCachedRadStrokeCount } from '@/lib/hanziLoader'
import { uid } from '@/lib/utils'
import * as api from '@/api/client'

interface StudioState {
  // 汉字列表
  chars: CharItem[]
  currentIndex: number
  // 配置
  style: StyleConfig
  anim: AnimConfig
  canvas: CanvasConfig
  activeTemplateId: string
  // 模板（本地内置 + 后端自定义合并展示）
  templates: Template[]
  // 后端持久化的资料库
  projects: Project[]
  savedTemplates: SavedTemplate[]
  history: HistoryRecord[]
  libraryLoaded: boolean
  // 导出任务
  tasks: ExportTask[]
  // 播放器命令（由控制栏触发，HanziCanvas 消费）
  playbackCmd: { type: 'play' | 'replay' | 'next' | 'prev' | 'pause' | 'resume' | 'restart' | 'jump'; seq: number; stroke?: number }
  // 逐笔进度
  currentStroke: number
  totalStrokes: number

  // actions
  addChars: (chars: string[]) => Promise<void>
  removeChar: (char: string) => void
  clearChars: () => void
  reorderChars: (from: number, to: number) => void
  selectChar: (index: number) => void
  applyTemplate: (id: string) => void
  saveTemplate: (name: string) => void
  // 资料库管理
  loadLibrary: () => Promise<void>
  saveCurrentProject: (name: string) => Promise<void>
  loadProject: (id: number) => Promise<void>
  deleteProjectById: (id: number) => Promise<void>
  saveTemplateToServer: (name: string) => Promise<void>
  deleteTemplateById: (id: number) => Promise<void>
  deleteHistoryById: (id: number) => Promise<void>
  reexportHistory: (record: HistoryRecord) => void
  setStyle: (patch: Partial<StyleConfig>) => void
  setAnim: (patch: Partial<AnimConfig>) => void
  setCanvas: (patch: Partial<CanvasConfig>) => void
  sendPlayback: (type: 'play' | 'replay' | 'next' | 'prev' | 'pause' | 'resume' | 'restart') => void
  jumpToStroke: (stroke: number) => void
  setStrokeProgress: (current: number, total: number) => void
  addTask: (task: Omit<ExportTask, 'id' | 'createdAt'>) => string
  updateTask: (id: string, patch: Partial<ExportTask>) => void
  removeTask: (id: string) => void
  retryTask: (id: string) => void
}

export const useStudioStore = create<StudioState>((set, get) => ({
  chars: [],
  currentIndex: 0,
  style: { ...DEFAULT_STYLE },
  anim: { ...DEFAULT_ANIM },
  canvas: { size: 512, customSize: 512 },
  activeTemplateId: 'tpl-a',
  templates: [...BUILTIN_TEMPLATES],
  projects: [],
  savedTemplates: [],
  history: [],
  libraryLoaded: false,
  tasks: [],
  playbackCmd: { type: 'restart', seq: 0 },
  currentStroke: 0,
  totalStrokes: 0,

  addChars: async (incoming) => {
    if (!incoming.length) return
    const existing = new Set(get().chars.map((c) => c.char))
    const fresh = incoming.filter((c) => !existing.has(c))
    if (!fresh.length) return
    const newItems: CharItem[] = fresh.map((char) => ({
      char,
      strokeCount: 0,
      radStrokeCount: 0,
      status: 'pending',
    }))
    set((s) => ({ chars: [...s.chars, ...newItems] }))

    // 异步校验字库数据
    const availability = await prefetchChars(fresh)
    set((s) => ({
      chars: s.chars.map((c) =>
        fresh.includes(c.char)
          ? {
              ...c,
              status: availability[c.char] ? 'ready' : 'missing',
              strokeCount: availability[c.char]
                ? getCachedStrokeCount(c.char)
                : 0,
              radStrokeCount: availability[c.char]
                ? getCachedRadStrokeCount(c.char)
                : 0,
            }
          : c,
      ),
    }))
  },

  removeChar: (char) =>
    set((s) => {
      const idx = s.chars.findIndex((c) => c.char === char)
      const chars = s.chars.filter((c) => c.char !== char)
      let currentIndex = s.currentIndex
      if (idx < currentIndex) currentIndex -= 1
      else if (idx === currentIndex) currentIndex = Math.min(currentIndex, chars.length - 1)
      return { chars, currentIndex: Math.max(0, currentIndex) }
    }),

  clearChars: () => set({ chars: [], currentIndex: 0, currentStroke: 0, totalStrokes: 0 }),

  reorderChars: (from, to) =>
    set((s) => {
      const chars = [...s.chars]
      const [moved] = chars.splice(from, 1)
      chars.splice(to, 0, moved)
      return { chars }
    }),

  selectChar: (index) =>
    set({ currentIndex: index, currentStroke: 0, playbackCmd: { type: 'restart', seq: Date.now() } }),

  applyTemplate: (id) => {
    const tpl = get().templates.find((t) => t.id === id)
    if (!tpl) return
    set({
      style: { ...tpl.style },
      anim: { ...tpl.anim },
      activeTemplateId: id,
      playbackCmd: { type: 'restart', seq: Date.now() },
    })
  },

  saveTemplate: (name) =>
    set((s) => {
      const tpl: Template = {
        id: 'tpl-' + uid(),
        name,
        description: '自定义模板',
        style: { ...s.style },
        anim: { ...s.anim },
        builtin: false,
      }
      return { templates: [...s.templates, tpl] }
    }),

  // ---------------- 资料库管理 ----------------
  loadLibrary: async () => {
    try {
      const [projects, templates, history] = await Promise.all([
        api.listProjects(), api.listTemplates(), api.listHistory(),
      ])
      set({
        projects: projects.projects,
        savedTemplates: templates.templates,
        history: history.records,
        libraryLoaded: true,
      })
      // 把后端自定义模板合并进可选模板列表（内置模板保持在前）
      const serverTpls: Template[] = templates.templates
        .filter((t) => !t.builtin)
        .map((t) => ({
          id: `srv-${t.id}`,
          name: t.name,
          description: '我的模板（已保存）',
          style: t.style,
          anim: t.anim,
          builtin: false,
        }))
      set((s) => ({
        templates: [...BUILTIN_TEMPLATES, ...serverTpls],
      }))
    } catch {
      // 后端未启动时静默降级：内置模板仍可用
      set({ libraryLoaded: true })
    }
  },

  saveCurrentProject: async (name) => {
    const created = await api.createProject(name, get().chars.map((c) => c.char))
    set((s) => ({ projects: [created, ...s.projects] }))
  },

  loadProject: async (id) => {
    const p = get().projects.find((x) => x.id === id)
    if (!p) return
    set({ chars: [], currentIndex: 0, currentStroke: 0, totalStrokes: 0 })
    await get().addChars(p.chars)
  },

  deleteProjectById: async (id) => {
    await api.deleteProject(id)
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
  },

  saveTemplateToServer: async (name) => {
    const { style, anim } = get()
    const created = await api.createTemplate(name, style, anim)
    set((s) => ({
      savedTemplates: [created, ...s.savedTemplates],
      templates: [...s.templates, {
        id: `srv-${created.id}`,
        name: created.name,
        description: '我的模板（已保存）',
        style: created.style,
        anim: created.anim,
        builtin: false,
      }],
    }))
  },

  deleteTemplateById: async (id) => {
    await api.deleteTemplate(id)
    set((s) => ({
      savedTemplates: s.savedTemplates.filter((t) => t.id !== id),
      templates: s.templates.filter((t) => t.id !== `srv-${id}`),
    }))
  },

  deleteHistoryById: async (id) => {
    await api.deleteHistory(id)
    set((s) => ({ history: s.history.filter((h) => h.id !== id) }))
  },

  reexportHistory: (record) => {
    const fmt = record.format.split(':')[0] as ExportFormat
    if (!['gif', 'mp4', 'png', 'svg'].includes(fmt)) return
    const char = record.params.char || record.chars[0]
    if (!char) return
    const size = record.params.size || 512
    const params = { char, style: record.params.style, anim: record.params.anim, size }
    const id = get().addTask({
      chars: [char], format: fmt, status: 'pending', progress: 0,
      kind: 'single', retryContext: { chars: [char], format: fmt, params },
    })
    import('@/lib/exportDispatcher').then((m) => m.dispatchExport(id, [char], fmt, params))
  },

  setStyle: (patch) => set((s) => ({ style: { ...s.style, ...patch } })),
  setAnim: (patch) => set((s) => ({ anim: { ...s.anim, ...patch } })),
  setCanvas: (patch) => set((s) => ({ canvas: { ...s.canvas, ...patch } })),

  sendPlayback: (type) =>
    set((s) => ({ playbackCmd: { type, seq: s.playbackCmd.seq + 1 } })),

  jumpToStroke: (stroke) =>
    set((s) => ({ playbackCmd: { type: 'jump', stroke, seq: s.playbackCmd.seq + 1 } })),

  setStrokeProgress: (current, total) => set({ currentStroke: current, totalStrokes: total }),

  addTask: (task) => {
    const id = uid()
    set((s) => ({
      tasks: [{ ...task, id, createdAt: Date.now() }, ...s.tasks],
    }))
    return id
  },

  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  retryTask: (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, status: 'pending' as const, progress: 0, error: undefined } : t,
      ),
    }))
    import('@/lib/exportDispatcher').then((m) => {
      if (task.kind === 'bundle' && task.retryContext) {
        const { chars, format, params } = task.retryContext
        return m.dispatchBundle(id, chars, format, params)
      }
      if (task.kind === 'decompose' && task.decomposeContext) {
        return m.dispatchDecompose(id, task.decomposeContext)
      }
      if (task.kind === 'pdf' && task.pdfContext) {
        return m.dispatchPracticePdf(id, task.pdfContext)
      }
      if (task.retryContext) {
        const { chars, format, params } = task.retryContext
        return m.dispatchExport(id, chars, format, params)
      }
    })
  },
}))
