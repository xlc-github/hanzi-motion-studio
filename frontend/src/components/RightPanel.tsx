import { useState } from 'react'
import { useStudioStore } from '@/store/useStudioStore'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SettingRow } from '@/components/settings/SettingRow'
import { ColorField } from '@/components/settings/ColorField'
import { Save, Download, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GridType, ExportFormat } from '@/types'

export function RightPanel() {
  const style = useStudioStore((s) => s.style)
  const anim = useStudioStore((s) => s.anim)
  const canvas = useStudioStore((s) => s.canvas)
  const templates = useStudioStore((s) => s.templates)
  const activeTemplateId = useStudioStore((s) => s.activeTemplateId)
  const chars = useStudioStore((s) => s.chars)
  const currentIndex = useStudioStore((s) => s.currentIndex)
  const applyTemplate = useStudioStore((s) => s.applyTemplate)
  const saveTemplate = useStudioStore((s) => s.saveTemplate)
  const setStyle = useStudioStore((s) => s.setStyle)
  const setAnim = useStudioStore((s) => s.setAnim)
  const setCanvas = useStudioStore((s) => s.setCanvas)
  const addTask = useStudioStore((s) => s.addTask)
  const saveTemplateToServer = useStudioStore((s) => s.saveTemplateToServer)
  const [tplName, setTplName] = useState('')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('gif')
  const [exportScope, setExportScope] = useState<'single' | 'batch'>('single')
  const [decomposeFormat, setDecomposeFormat] = useState<'png' | 'svg'>('png')
  const [busy, setBusy] = useState(false)

  const current = chars[currentIndex]
  const availableChars = chars.filter((c) => c.status === 'ready').map((c) => c.char)
  const size = canvas.size === 0 ? canvas.customSize : canvas.size

  const handleSaveTemplate = async () => {
    const name = tplName.trim() || `自定义模板 ${templates.length + 1}`
    setBusy(true)
    try {
      // 后端不可用时降级为本地临时模板，保证功能不中断
      try { await saveTemplateToServer(name) } catch { saveTemplate(name) }
      setTplName('')
    } finally {
      setBusy(false)
    }
  }

  const handleExport = () => {
    if (!availableChars.length) return
    const targetChars = exportScope === 'single' && current ? [current.char] : availableChars
    const params = { char: targetChars[0], style, anim, size }
    const isBundle = targetChars.length > 1

    if (isBundle) {
      const id = addTask({
        chars: targetChars, format: exportFormat, status: 'pending', progress: 0,
        kind: 'bundle',
        retryContext: { chars: targetChars, format: exportFormat, params },
      })
      import('@/lib/exportDispatcher').then((m) =>
        m.dispatchBundle(id, targetChars, exportFormat, { style, anim, size }))
    } else {
      const id = addTask({
        chars: targetChars, format: exportFormat, status: 'pending', progress: 0,
        kind: 'single',
        retryContext: { chars: targetChars, format: exportFormat, params },
      })
      import('@/lib/exportDispatcher').then((m) => m.dispatchExport(id, targetChars, exportFormat, params))
    }
  }

  const handleDecompose = () => {
    if (!current) return
    const id = addTask({
      chars: [current.char], format: 'png', status: 'pending', progress: 0,
      kind: 'decompose',
      decomposeContext: { char: current.char, style, size, imageFormat: decomposeFormat },
    })
    import('@/lib/exportDispatcher').then((m) =>
      m.dispatchDecompose(id, { char: current.char, style, size, imageFormat: decomposeFormat }))
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <Tabs defaultValue="style" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="template">模板</TabsTrigger>
          <TabsTrigger value="style">样式</TabsTrigger>
          <TabsTrigger value="anim">动画</TabsTrigger>
          <TabsTrigger value="canvas">画布</TabsTrigger>
          <TabsTrigger value="export">导出</TabsTrigger>
        </TabsList>

        {/* 模板 */}
        <TabsContent value="template" className="space-y-3">
          <div className="space-y-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl.id)}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  activeTemplateId === tpl.id
                    ? 'border-primary bg-sage-50'
                    : 'border-border bg-white hover:border-sage-300',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{tpl.name}</span>
                  {activeTemplateId === tpl.id && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{tpl.description}</p>
                <div className="mt-2 flex gap-1.5">
                  <span className="h-4 w-4 rounded border border-black/10" style={{ background: tpl.style.background }} />
                  <span className="h-4 w-4 rounded border border-black/10" style={{ background: tpl.style.strokeColor }} />
                  <span className="ml-1 text-[10px] text-muted-foreground">{tpl.style.grid === 'tian' ? '田字格' : tpl.style.grid === 'mi' ? '米字格' : '无格'}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            <label className="text-xs">保存当前设置为模板</label>
            <div className="flex gap-2">
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="模板名称"
                className="h-8"
              />
              <Button size="sm" onClick={handleSaveTemplate}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* 样式 */}
        <TabsContent value="style" className="space-y-4">
          <SettingRow label="辅助格">
            <Select value={style.grid} onValueChange={(v) => setStyle({ grid: v as GridType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tian">田字格</SelectItem>
                <SelectItem value="mi">米字格</SelectItem>
                <SelectItem value="none">无辅助格</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <ColorField label="格线颜色" value={style.gridColor} onChange={(v) => setStyle({ gridColor: v })} disabled={style.grid === 'none'} />
          <SettingRow label="格线粗细" value={`${style.gridLineWidth}px`}>
            <Slider min={0.5} max={3} step={0.5} value={[style.gridLineWidth]} onValueChange={([v]) => setStyle({ gridLineWidth: v })} />
          </SettingRow>
          <div className="border-t border-border pt-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs">透明背景</span>
            <Switch checked={style.transparent} onCheckedChange={(v) => setStyle({ transparent: v })} />
          </div>
          <ColorField label="背景颜色" value={style.background} onChange={(v) => setStyle({ background: v })} disabled={style.transparent} />
          <ColorField label="笔画颜色" value={style.strokeColor} onChange={(v) => setStyle({ strokeColor: v })} />
          <ColorField label="轮廓颜色" value={style.outlineColor} onChange={(v) => setStyle({ outlineColor: v })} />
          <ColorField label="高亮颜色" value={style.highlightColor} onChange={(v) => setStyle({ highlightColor: v })} />
          <SettingRow label="字形大小" value={`${Math.round(style.glyphScale * 100)}%`}>
            <Slider min={0.5} max={0.98} step={0.01} value={[style.glyphScale]} onValueChange={([v]) => setStyle({ glyphScale: v })} />
          </SettingRow>
          <SettingRow label="内边距" value={`${style.padding}px`}>
            <Slider min={0} max={60} step={2} value={[style.padding]} onValueChange={([v]) => setStyle({ padding: v })} />
          </SettingRow>
          <SettingRow label="圆角" value={`${style.borderRadius}px`}>
            <Slider min={0} max={48} step={2} value={[style.borderRadius]} onValueChange={([v]) => setStyle({ borderRadius: v })} />
          </SettingRow>
          <div className="flex items-center justify-between">
            <span className="text-xs">动画当前笔高亮</span>
            <Switch checked={style.highlightCurrentStroke} onCheckedChange={(v) => setStyle({ highlightCurrentStroke: v })} />
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground">笔画分解图</p>
            <div className="flex items-center justify-between">
              <span className="text-xs">当前笔强调色</span>
              <Switch
                checked={style.emphasizeDecomposeStroke}
                onCheckedChange={(v) => setStyle({ emphasizeDecomposeStroke: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">笔画序号标注</span>
              <Switch
                checked={style.showStrokeNumbers}
                onCheckedChange={(v) => setStyle({ showStrokeNumbers: v })}
              />
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              强调色让当前书写笔更醒目；序号在每笔起点以红圈白字标出（分解图导出与画布预览同步生效）。
            </p>
          </div>
        </TabsContent>

        {/* 动画 */}
        <TabsContent value="anim" className="space-y-4">
          <SettingRow label="书写速度" value={`${anim.speed.toFixed(2)}×`}>
            <Slider min={0.2} max={3} step={0.1} value={[anim.speed]} onValueChange={([v]) => setAnim({ speed: v })} />
          </SettingRow>
          <SettingRow label="笔画间隔" value={`${anim.strokeGap}ms`}>
            <Slider min={0} max={1000} step={20} value={[anim.strokeGap]} onValueChange={([v]) => setAnim({ strokeGap: v })} />
          </SettingRow>
          <SettingRow label="循环间隔" value={`${anim.loopGap}ms`}>
            <Slider min={200} max={4000} step={100} value={[anim.loopGap]} onValueChange={([v]) => setAnim({ loopGap: v })} />
          </SettingRow>
          <div className="flex items-center justify-between">
            <span className="text-xs">循环播放</span>
            <Switch checked={anim.loop} onCheckedChange={(v) => setAnim({ loop: v })} />
          </div>
          <div className="border-t border-border pt-3" />
          <SettingRow label="首帧停顿" value={`${anim.headPause}ms`}>
            <Slider min={0} max={2000} step={100} value={[anim.headPause]} onValueChange={([v]) => setAnim({ headPause: v })} />
          </SettingRow>
          <SettingRow label="尾帧停顿" value={`${anim.tailPause}ms`}>
            <Slider min={0} max={3000} step={100} value={[anim.tailPause]} onValueChange={([v]) => setAnim({ tailPause: v })} />
          </SettingRow>
          <SettingRow label="帧率" value={`${anim.fps} fps`}>
            <Slider min={10} max={60} step={5} value={[anim.fps]} onValueChange={([v]) => setAnim({ fps: v })} />
          </SettingRow>
        </TabsContent>

        {/* 画布 */}
        <TabsContent value="canvas" className="space-y-4">
          <SettingRow label="画布尺寸">
            <Select
              value={String(canvas.size)}
              onValueChange={(v) => setCanvas({ size: v === 'custom' ? 0 : Number(v) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="256">256 × 256</SelectItem>
                <SelectItem value="512">512 × 512</SelectItem>
                <SelectItem value="1024">1024 × 1024</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          {canvas.size === 0 && (
            <SettingRow label="自定义尺寸" value="px">
              <Input
                type="number"
                value={canvas.customSize}
                onChange={(e) => setCanvas({ customSize: Math.max(64, Number(e.target.value)) })}
                className="h-8"
              />
            </SettingRow>
          )}
          <div className="rounded-lg bg-sage-50 p-3 text-[11px] leading-relaxed text-sage-700">
            导出尺寸决定素材清晰度。插入 PPT 推荐 512 或 1024；社交媒体可用 256。
          </div>
        </TabsContent>

        {/* 导出 */}
        <TabsContent value="export" className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs">导出格式</label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gif">GIF 动画</SelectItem>
                <SelectItem value="mp4">MP4 视频 (H.264)</SelectItem>
                <SelectItem value="png">PNG 图片</SelectItem>
                <SelectItem value="svg">SVG 矢量</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs">导出范围</label>
            <Select value={exportScope} onValueChange={(v) => setExportScope(v as 'single' | 'batch')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">当前单字</SelectItem>
                <SelectItem value="batch">全部生字（批量）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg bg-sage-50 p-3 text-[11px] leading-relaxed text-sage-700">
            将导出 {exportScope === 'single' ? (current ? `「${current.char}」` : '当前字') : `${availableChars.length} 个字`}
            （{size}px，{exportFormat.toUpperCase()}）
            {exportScope === 'batch' && availableChars.length > 1 && '，批量将自动打包为一个 ZIP'}
          </div>
          <Button className="w-full" onClick={handleExport} disabled={!availableChars.length}>
            <Download className="h-4 w-4" /> 开始导出
          </Button>

          <div className="border-t border-border pt-4 space-y-2">
            <label className="text-xs font-medium">笔画分解图</label>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              生成逐笔步骤图（前 n 笔实心、其余轮廓）与总览图，打包 ZIP，适合备课与打印。
            </p>
            <Select value={decomposeFormat} onValueChange={(v) => setDecomposeFormat(v as 'png' | 'svg')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG 图片</SelectItem>
                <SelectItem value="svg">SVG 矢量</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" variant="outline" onClick={handleDecompose} disabled={!current}>
              <Download className="h-4 w-4" /> 导出「{current?.char ?? '—'}」分解图
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">任务进度与下载请在底部队列查看。</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
