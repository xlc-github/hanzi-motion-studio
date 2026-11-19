/** 后端 API 调用封装 */
import type {
  StyleConfig, AnimConfig, Project, SavedTemplate, HistoryRecord,
} from '@/types'

const API_BASE = '/api'

export interface HealthResponse {
  status: string
  service: string
  version: string
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) throw new Error('后端服务不可用')
  return res.json()
}

export async function validateChars(chars: string[]) {
  const res = await fetch(`${API_BASE}/chars/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chars }),
  })
  if (!res.ok) throw new Error('校验失败')
  return res.json()
}

export interface ExportParams {
  char: string
  style: StyleConfig
  anim: AnimConfig
  size: number
  loopCount?: number
}

/** 请求后端导出（异步任务，返回任务 ID） */
export async function requestExport(
  format: 'gif' | 'mp4' | 'png' | 'svg',
  params: ExportParams,
): Promise<{ taskId: string }> {
  const res = await fetch(`${API_BASE}/export/${format}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`导出请求失败: ${res.status}`)
  return res.json()
}

/** 轮询任务状态 */
export async function getTask(taskId: string) {
  const res = await fetch(`${API_BASE}/export/tasks/${taskId}`)
  if (!res.ok) throw new Error('查询任务失败')
  return res.json()
}

/** 批量导出打包为 ZIP（一次下载） */
export async function requestBundle(
  format: 'gif' | 'mp4' | 'png' | 'svg',
  chars: string[],
  params: { style: StyleConfig; anim: AnimConfig; size: number; loopCount?: number },
): Promise<{ taskId: string }> {
  const res = await fetch(`${API_BASE}/export/bundle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, chars, ...params }),
  })
  if (!res.ok) throw new Error(`批量打包请求失败: ${res.status}`)
  return res.json()
}

/** 笔画分解图导出 */
export async function requestDecompose(params: {
  char: string; style: StyleConfig; size: number; image_format: 'png' | 'svg'
}): Promise<{ taskId: string }> {
  const res = await fetch(`${API_BASE}/export/decompose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`分解图导出请求失败: ${res.status}`)
  return res.json()
}

/** 练习页 PDF 导出：把已渲染的 A4 SVG 交给后端转 PDF */
export async function requestPracticePdf(char: string, svg: string): Promise<{ taskId: string }> {
  const res = await fetch(`${API_BASE}/export/practice-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ char, svg }),
  })
  if (!res.ok) throw new Error(`PDF 导出请求失败: ${res.status}`)
  return res.json()
}

// ---------------- 项目 / 模板 / 历史 CRUD ----------------

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) throw new Error(`请求失败: ${res.status}`)
  return res.json()
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
})

export async function listProjects(): Promise<{ projects: Project[] }> {
  return apiFetch('/projects')
}
export async function createProject(name: string, chars: string[]): Promise<Project> {
  return apiFetch('/projects', jsonInit('POST', { name, chars }))
}
export async function updateProject(id: number, name: string, chars: string[]): Promise<Project> {
  return apiFetch(`/projects/${id}`, jsonInit('PUT', { name, chars }))
}
export async function deleteProject(id: number): Promise<{ ok: boolean }> {
  return apiFetch(`/projects/${id}`, { method: 'DELETE' })
}

export async function listTemplates(): Promise<{ templates: SavedTemplate[] }> {
  return apiFetch('/templates')
}
export async function createTemplate(
  name: string, style: StyleConfig, anim: AnimConfig,
): Promise<SavedTemplate> {
  return apiFetch('/templates', jsonInit('POST', {
    name, style_json: JSON.stringify(style), anim_json: JSON.stringify(anim), builtin: false,
  }))
}
export async function deleteTemplate(id: number): Promise<{ ok: boolean }> {
  return apiFetch(`/templates/${id}`, { method: 'DELETE' })
}

export async function listHistory(): Promise<{ records: HistoryRecord[] }> {
  return apiFetch('/history')
}
export async function deleteHistory(id: number): Promise<{ ok: boolean }> {
  return apiFetch(`/history/${id}`, { method: 'DELETE' })
}
