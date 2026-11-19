/** 资料库面板：项目 / 我的模板 / 导出历史（SQLite 持久化） */
import { useState } from 'react'
import { useStudioStore } from '@/store/useStudioStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FolderOpen, Save, Trash2, RotateCcw, Palette, History, Loader2,
} from 'lucide-react'

export function LibraryPanel() {
  const projects = useStudioStore((s) => s.projects)
  const savedTemplates = useStudioStore((s) => s.savedTemplates)
  const history = useStudioStore((s) => s.history)
  const libraryLoaded = useStudioStore((s) => s.libraryLoaded)
  const saveCurrentProject = useStudioStore((s) => s.saveCurrentProject)
  const loadProject = useStudioStore((s) => s.loadProject)
  const deleteProjectById = useStudioStore((s) => s.deleteProjectById)
  const saveTemplateToServer = useStudioStore((s) => s.saveTemplateToServer)
  const deleteTemplateById = useStudioStore((s) => s.deleteTemplateById)
  const deleteHistoryById = useStudioStore((s) => s.deleteHistoryById)
  const reexportHistory = useStudioStore((s) => s.reexportHistory)
  const applyTemplateId = useStudioStore((s) => s.applyTemplate)
  const templates = useStudioStore((s) => s.templates)

  const [projectName, setProjectName] = useState('')
  const [tplName, setTplName] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSaveProject = async () => {
    const name = projectName.trim() || `生字集 ${projects.length + 1}`
    setBusy(true)
    try { await saveCurrentProject(name); setProjectName('') } finally { setBusy(false) }
  }
  const handleSaveTemplate = async () => {
    const name = tplName.trim() || `我的模板 ${savedTemplates.length + 1}`
    setBusy(true)
    try { await saveTemplateToServer(name); setTplName('') } finally { setBusy(false) }
  }

  if (!libraryLoaded) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> 加载资料库…
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* 项目 */}
      <section className="space-y-2">
        <div className="flex items-center gap-1.5">
          <FolderOpen className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-semibold">生字项目</h3>
          <span className="ml-auto text-[10px] text-muted-foreground">{projects.length}</span>
        </div>
        <div className="flex gap-1.5">
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)}
            placeholder="项目名（如：火烧云）" className="h-8" />
          <Button size="sm" onClick={handleSaveProject} disabled={busy} title="保存当前生字为新项目">
            <Save className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {projects.length === 0 && <p className="text-[10px] text-muted-foreground">暂无项目，先添加生字再保存。</p>}
          {projects.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border bg-white px-2 py-1.5">
              <button onClick={() => loadProject(p.id)} className="min-w-0 flex-1 text-left" title="点击载入该项目生字">
                <div className="truncate text-[11px] font-medium hover:text-primary">{p.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">{p.chars.join(' ') || '（空）'}</div>
              </button>
              <button onClick={() => deleteProjectById(p.id)} className="rounded p-1 text-muted-foreground hover:text-red-600" title="删除项目">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 我的模板 */}
      <section className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-semibold">我的模板</h3>
          <span className="ml-auto text-[10px] text-muted-foreground">{savedTemplates.length}</span>
        </div>
        <div className="flex gap-1.5">
          <Input value={tplName} onChange={(e) => setTplName(e.target.value)}
            placeholder="模板名（保存当前样式）" className="h-8" />
          <Button size="sm" onClick={handleSaveTemplate} disabled={busy} title="保存当前样式与动画为新模板">
            <Save className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {savedTemplates.length === 0 && <p className="text-[10px] text-muted-foreground">暂无自定义模板。内置模板在右侧「模板」标签。</p>}
          {savedTemplates.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border bg-white px-2 py-1.5">
              <button onClick={() => {
                const local = templates.find((x) => x.id === `srv-${t.id}`)
                if (local) applyTemplateId(local.id)
              }} className="min-w-0 flex-1 text-left" title="点击应用该模板">
                <div className="truncate text-[11px] font-medium hover:text-primary">{t.name}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm border border-black/10" style={{ background: t.style.strokeColor }} />
                  {t.style.grid === 'tian' ? '田字格' : t.style.grid === 'mi' ? '米字格' : '无格'}
                </div>
              </button>
              <button onClick={() => deleteTemplateById(t.id)} className="rounded p-1 text-muted-foreground hover:text-red-600" title="删除模板">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 导出历史 */}
      <section className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-semibold">导出历史</h3>
          <span className="ml-auto text-[10px] text-muted-foreground">{history.length}</span>
        </div>
        <div className="space-y-1">
          {history.length === 0 && <p className="text-[10px] text-muted-foreground">暂无导出记录。</p>}
          {history.map((h) => (
            <div key={h.id} className="flex items-center gap-2 rounded-lg border border-border bg-white px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-medium">{h.chars.join('') || h.format} · {h.format}</div>
                <div className="text-[10px] text-muted-foreground">{h.createdAt}</div>
              </div>
              <button onClick={() => reexportHistory(h)} className="rounded p-1 text-muted-foreground hover:text-primary" title="重新导出">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => deleteHistoryById(h.id)} className="rounded p-1 text-muted-foreground hover:text-red-600" title="删除记录">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
