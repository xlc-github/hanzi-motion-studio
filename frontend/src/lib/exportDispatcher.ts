/** 导出调度：提交后端任务 → 轮询进度 → 下载产物 */
import type { ExportFormat, StyleConfig, AnimConfig } from '@/types'
import { requestExport, getTask, requestBundle, requestDecompose, requestPracticePdf } from '@/api/client'
import { useStudioStore } from '@/store/useStudioStore'

interface ExportParams {
  char: string
  style: StyleConfig
  anim: AnimConfig
  size: number
}

/** 轮询后端任务直到完成，返回 downloadUrl。每轮回调进度 0-100。 */
async function pollTask(
  backendId: string,
  onProgress: (p: number) => void,
  timeoutMs = 180000,
): Promise<string> {
  const start = Date.now()
  let done = false
  let url = ''
  while (!done) {
    await new Promise((r) => setTimeout(r, 350))
    const status = await getTask(backendId)
    if (typeof status.progress === 'number') onProgress(status.progress)
    if (status.status === 'done') {
      done = true
      if (status.downloadUrl) url = status.downloadUrl
    } else if (status.status === 'failed') {
      throw new Error(status.error || '未知错误')
    } else if (Date.now() - start > timeoutMs) {
      throw new Error('导出超时，请重试')
    }
  }
  return url
}

export function triggerDownload(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url.startsWith('/') ? url : `/${url}`
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/** 单字/逐字导出 */
export async function dispatchExport(
  taskId: string,
  chars: string[],
  format: ExportFormat,
  params: ExportParams,
) {
  const { updateTask } = useStudioStore.getState()
  try {
    updateTask(taskId, { status: 'running', progress: 5, kind: 'single' })
    let lastUrl = ''
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i]
      const { taskId: backendId } = await requestExport(format, { ...params, char })
      const url = await pollTask(backendId, (p) => {
        // 单字任务在 UI 上按 (已完成字数 + 当前字进度/字数) 平滑显示
        const overall = Math.round(((i + p / 100) / chars.length) * 100)
        updateTask(taskId, { progress: Math.min(99, overall) })
      })
      if (url) {
        lastUrl = url
        updateTask(taskId, { downloadUrl: url, downloadName: `hanzi_${char}.${format}` })
        triggerDownload(url, `hanzi_${char}.${format}`)
      }
    }
    updateTask(taskId, { status: 'done', progress: 100, downloadUrl: lastUrl || undefined })
  } catch (e) {
    updateTask(taskId, {
      status: 'failed',
      error: e instanceof Error ? e.message : String(e),
    })
  }
}

/** 批量导出 → ZIP 打包，浏览器一次下载 */
export async function dispatchBundle(
  taskId: string,
  chars: string[],
  format: ExportFormat,
  params: Omit<ExportParams, 'char'>,
) {
  const { updateTask } = useStudioStore.getState()
  try {
    updateTask(taskId, { status: 'running', progress: 5, kind: 'bundle' })
    const { taskId: backendId } = await requestBundle(format, chars, params)
    const url = await pollTask(backendId, (p) => updateTask(taskId, { progress: p }))
    const name = `hanzi_batch_${chars.length}字_${format}.zip`
    updateTask(taskId, { status: 'done', progress: 100, downloadUrl: url, downloadName: name })
    if (url) triggerDownload(url, name)
  } catch (e) {
    updateTask(taskId, {
      status: 'failed',
      error: e instanceof Error ? e.message : String(e),
    })
  }
}

/** 笔画分解图导出 */
export async function dispatchDecompose(
  taskId: string,
  params: { char: string; style: StyleConfig; size: number; imageFormat: 'png' | 'svg' },
) {
  const { updateTask } = useStudioStore.getState()
  try {
    updateTask(taskId, { status: 'running', progress: 5, kind: 'decompose' })
    const { taskId: backendId } = await requestDecompose({
      char: params.char, style: params.style, size: params.size, image_format: params.imageFormat,
    })
    const url = await pollTask(backendId, (p) => updateTask(taskId, { progress: p }))
    const name = `hanzi_${params.char}_分解图_${params.imageFormat}.zip`
    updateTask(taskId, { status: 'done', progress: 100, downloadUrl: url, downloadName: name })
    if (url) triggerDownload(url, name)
  } catch (e) {
    updateTask(taskId, {
      status: 'failed',
      error: e instanceof Error ? e.message : String(e),
    })
  }
}

/** 练习页 PDF 导出：前端渲染的 SVG → 后端转 A4 PDF */
export async function dispatchPracticePdf(
  taskId: string,
  params: { char: string; svg: string },
) {
  const { updateTask } = useStudioStore.getState()
  try {
    updateTask(taskId, { status: 'running', progress: 5, kind: 'pdf' })
    const { taskId: backendId } = await requestPracticePdf(params.char, params.svg)
    const url = await pollTask(backendId, (p) => updateTask(taskId, { progress: p }))
    const name = `hanzi_${params.char}_练习页.pdf`
    updateTask(taskId, { status: 'done', progress: 100, downloadUrl: url, downloadName: name })
    if (url) triggerDownload(url, name)
  } catch (e) {
    updateTask(taskId, {
      status: 'failed',
      error: e instanceof Error ? e.message : String(e),
    })
  }
}
