import type { CharData, StyleConfig } from '@/types'
import { StrokeStepSvg } from '@/components/StrokeStepSvg'
import { useStudioStore } from '@/store/useStudioStore'

interface StrokeGridPanelProps {
  char: string
  data: CharData
  style: StyleConfig
}

/**
 * 笔顺分解缩略墙：把每一笔渲染成小格，网格排列。
 * 点击某格 → 画布跳转并停到该笔（jumpToStroke）。
 */
export function StrokeGridPanel({ char, data, style }: StrokeGridPanelProps) {
  const jumpToStroke = useStudioStore((s) => s.jumpToStroke)
  const currentStroke = useStudioStore((s) => s.currentStroke)
  const total = data.strokes.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground">
          「{char}」共 {total} 笔 · 点击任一步在画布中定位
        </p>
        <span className="text-[10px] text-muted-foreground">红圈=当前笔 · 橙色=强调</span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: total }).map((_, i) => {
          const step = i + 1
          const active = currentStroke === step
          return (
            <button
              key={step}
              onClick={() => jumpToStroke(step)}
              title={`跳到第 ${step} 笔`}
              className={`group flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors ${
                active
                  ? 'border-primary bg-sage-50'
                  : 'border-border bg-white hover:border-sage-300'
              }`}
            >
              <StrokeStepSvg
                strokes={data.strokes}
                medians={data.medians}
                style={style}
                upto={step}
                size={72}
                showNumber
                showGrid={style.grid !== 'none'}
              />
              <span className={`text-[10px] ${active ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                第 {step} 笔
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
