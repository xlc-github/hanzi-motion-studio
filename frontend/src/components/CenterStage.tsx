import { useStudioStore } from '@/store/useStudioStore'
import { useCharData } from '@/hooks/useCharData'
import { HanziCanvas } from '@/components/HanziCanvas'
import { PlaybackControls } from '@/components/PlaybackControls'
import { CharInfoCard } from '@/components/CharInfoCard'
import { StrokeGridPanel } from '@/components/StrokeGridPanel'
import { StrokePathPanel } from '@/components/StrokePathPanel'
import { PracticeSheetPanel } from '@/components/PracticeSheetPanel'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Type, Grid3x3, Route, Printer, Loader2 } from 'lucide-react'

export function CenterStage() {
  const chars = useStudioStore((s) => s.chars)
  const currentIndex = useStudioStore((s) => s.currentIndex)
  const style = useStudioStore((s) => s.style)
  const current = chars[currentIndex]
  const { data, loading } = useCharData(current?.char)

  return (
    <div className="flex min-h-full flex-col gap-4 p-4">
      <div className="flex items-baseline justify-center gap-2">
        <h2 className="text-base font-semibold">实时预览</h2>
        <p className="text-[11px] text-muted-foreground">真实 SVG 笔顺动画 · 导出尺寸不受预览缩放影响</p>
      </div>

      {/* 核心预览：画布 + 字形数据卡，宽屏并排、窄屏堆叠。
          画布预览尺寸固定 340（导出仍用 store 的 canvas.size），避免中央区过大。 */}
      <div className="flex w-full flex-col items-center justify-center gap-4 lg:flex-row lg:items-start">
        <Card className="p-4">
          {current ? (
            <HanziCanvas char={current.char} sizeOverride={340} />
          ) : (
            <div className="flex h-[300px] w-[300px] max-w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border text-muted-foreground">
              <Type className="h-12 w-12 text-sage-300" />
              <span className="text-sm">请先在左侧添加生字</span>
            </div>
          )}
        </Card>
        {current && (
          <div className="w-full max-w-sm lg:w-72 lg:shrink-0">
            <CharInfoCard char={current.char} data={data} style={style} />
          </div>
        )}
      </div>

      {current && <PlaybackControls />}

      {/* 教学素材：三块 Tab，避免一次铺开拥挤 */}
      {current && (
        <Card className="w-full p-3">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-semibold">教学素材</h3>
            <span className="text-[10px] text-muted-foreground">基于本地笔画数据实时生成</span>
          </div>
          <Tabs defaultValue="grid">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="grid" className="gap-1.5">
                <Grid3x3 className="h-3.5 w-3.5" /> 笔顺分解
              </TabsTrigger>
              <TabsTrigger value="path" className="gap-1.5">
                <Route className="h-3.5 w-3.5" /> 路径图
              </TabsTrigger>
              <TabsTrigger value="sheet" className="gap-1.5">
                <Printer className="h-3.5 w-3.5" /> 练习页
              </TabsTrigger>
            </TabsList>

            <TabsContent value="grid" className="mt-3">
              {data ? (
                <StrokeGridPanel char={current.char} data={data} style={style} />
              ) : (
                <PanelSkeleton />
              )}
            </TabsContent>
            <TabsContent value="path" className="mt-3">
              {data ? (
                <StrokePathPanel char={current.char} data={data} style={style} />
              ) : (
                <PanelSkeleton />
              )}
            </TabsContent>
            <TabsContent value="sheet" className="mt-3">
              {data ? (
                <PracticeSheetPanel char={current.char} data={data} style={style} />
              ) : (
                <PanelSkeleton />
              )}
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="flex items-center gap-3 py-8 text-xs text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>加载笔画数据中…</span>
    </div>
  )
}
