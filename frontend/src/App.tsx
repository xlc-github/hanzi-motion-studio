import { useEffect, useState } from 'react'
import { LeftPanel } from '@/components/LeftPanel'
import { CenterStage } from '@/components/CenterStage'
import { RightPanel } from '@/components/RightPanel'
import { ExportQueue } from '@/components/ExportQueue'
import { checkHealth } from '@/api/client'
import { useStudioStore } from '@/store/useStudioStore'
import { Sparkles, Wifi, WifiOff } from 'lucide-react'

function App() {
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const loadLibrary = useStudioStore((s) => s.loadLibrary)

  useEffect(() => {
    checkHealth()
      .then(() => { setBackendOk(true); loadLibrary() })
      .catch(() => setBackendOk(false))
  }, [loadLibrary])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream">
      {/* 顶栏 */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">HanziMotion Studio</h1>
            <p className="text-[10px] leading-tight text-muted-foreground">汉字笔顺动画工坊</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {backendOk === true && (
            <span className="flex items-center gap-1 text-sage-600">
              <Wifi className="h-3.5 w-3.5" /> 服务已连接
            </span>
          )}
          {backendOk === false && (
            <span className="flex items-center gap-1 text-amber-600">
              <WifiOff className="h-3.5 w-3.5" /> 后端未启动（预览仍可用）
            </span>
          )}
          {backendOk === null && <span className="text-muted-foreground">连接中…</span>}
        </div>
      </header>

      {/* 三栏主体 */}
      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr_320px]">
        <aside className="min-h-0 border-r border-border bg-white">
          <LeftPanel />
        </aside>
        <main className="min-h-0 overflow-y-auto bg-cream">
          <CenterStage />
        </main>
        <aside className="min-h-0 border-l border-border bg-white">
          <RightPanel />
        </aside>
      </div>

      {/* 底部导出队列 */}
      <footer className="h-24 shrink-0 border-t border-border bg-white">
        <div className="flex items-center gap-2 border-b border-border px-4 py-1.5">
          <span className="text-[11px] font-semibold text-foreground">导出任务队列</span>
        </div>
        <div className="h-[calc(100%-28px)]">
          <ExportQueue />
        </div>
      </footer>
    </div>
  )
}

export default App
