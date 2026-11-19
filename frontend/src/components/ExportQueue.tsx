import { useStudioStore } from '@/store/useStudioStore'
import { Button } from '@/components/ui/button'
import { Download, X, CheckCircle2, XCircle, Loader2, RotateCcw, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ExportQueue() {
  const tasks = useStudioStore((s) => s.tasks)
  const removeTask = useStudioStore((s) => s.removeTask)
  const retryTask = useStudioStore((s) => s.retryTask)

  const handleDownload = (url?: string, name?: string) => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = name || 'result'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-2">
      {tasks.length === 0 ? (
        <div className="flex h-full items-center gap-2 text-xs text-muted-foreground">
          <ListChecks className="h-4 w-4" />
          <span>导出任务队列为空 — 在右侧「导出」中创建任务</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2"
            >
              {task.status === 'done' && <CheckCircle2 className="h-4 w-4 shrink-0 text-sage-600" />}
              {task.status === 'failed' && <XCircle className="h-4 w-4 shrink-0 text-red-600" />}
              {(task.status === 'running' || task.status === 'pending') && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-medium">
                    {task.chars.slice(0, 6).join('')}
                    {task.chars.length > 6 ? `… (${task.chars.length}字)` : ''}
                  </span>
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {task.kind === 'bundle' ? '批量ZIP' : task.kind === 'decompose' ? '分解图ZIP' : task.kind === 'pdf' ? '练习页PDF' : task.format}
                  </span>
                </div>
                {task.error ? (
                  <p className="truncate text-[10px] text-red-600">{task.error}</p>
                ) : (
                  <div className="mt-1 h-1 w-full rounded-full bg-sage-100">
                    <div
                      className={cn('h-full rounded-full transition-all', task.status === 'done' ? 'bg-sage-600' : 'bg-primary')}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">
                {task.progress}%
              </span>
              {task.downloadUrl && (
                <Button size="icon" variant="ghost" className="h-7 w-7" title="下载"
                  onClick={() => handleDownload(task.downloadUrl, task.downloadName)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
              {task.status === 'failed' && (
                <Button size="icon" variant="ghost" className="h-7 w-7" title="重试"
                  onClick={() => retryTask(task.id)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
              <button onClick={() => removeTask(task.id)} className="rounded p-1 text-muted-foreground hover:text-red-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
