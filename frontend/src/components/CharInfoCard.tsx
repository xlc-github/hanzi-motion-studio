import { useState } from 'react'
import { PenLine, Layers, Ruler, MoveHorizontal, Info, MousePointerClick } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useStudioStore } from '@/store/useStudioStore'
import type { CharData, StyleConfig } from '@/types'
import { computeMetrics, aspectLabel } from '@/lib/charMetrics'

interface CharInfoCardProps {
  /** 当前字（字符） */
  char: string
  /** 完整字数据，由 CenterStage 的 useCharData 统一加载并传入（单一数据源） */
  data: CharData | null
  style: StyleConfig
}

/** 迷你字形图：渲染完整字，部首笔画可高亮。坐标系与 StrokeStepSvg 一致。 */
function MiniGlyph({
  data, style, radical, highlight,
}: {
  data: CharData
  style: StyleConfig
  radical: number[]
  highlight: boolean
}) {
  const scale = 0.9
  const t = (1 - scale) * 512
  const ty = 900 * scale + t
  return (
    <svg viewBox="0 0 1024 1024" className="h-full w-full" aria-hidden>
      <g transform={`translate(${t.toFixed(2)},${ty.toFixed(2)}) scale(${scale},${-scale})`}>
        {data.strokes.map((d, i) => {
          const isRadical = radical.includes(i)
          const color = highlight && isRadical
            ? style.highlightColor
            : highlight
              ? style.outlineColor
              : style.strokeColor
          return <path key={i} d={d} fill={color} />
        })}
      </g>
    </svg>
  )
}

/**
 * 字形数据卡：仅呈现由 strokes / medians / radStrokes 派生的客观指标。
 * - 总笔画、部首笔画（可点击高亮部首）
 * - 逐笔长度条（可点击定位到该笔）
 * - 轨迹总长、字形宽高比
 * 零外部数据、零结构/类型推断（此类推断会误判，见 analysis）。
 */
export function CharInfoCard({ char, data, style }: CharInfoCardProps) {
  const jumpToStroke = useStudioStore((s) => s.jumpToStroke)
  const [highlightRadical, setHighlightRadical] = useState(false)

  const metrics = computeMetrics(data)
  const radical = data?.radStrokes ?? []
  const total = data?.strokes.length ?? 0
  const hasRadical = radical.length > 0

  if (!data || !metrics) {
    return (
      <Card className="w-full p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white">
            {char}
          </span>
          正在加载字形数据…
        </div>
      </Card>
    )
  }

  const maxLen = Math.max(...metrics.lengths, 1)

  return (
    <Card className="w-full p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white">
            {char}
          </span>
          <div>
            <div className="text-sm font-semibold">字形数据</div>
            <div className="text-[10px] text-muted-foreground">源自本地字库 · 实时统计</div>
          </div>
        </div>
      </div>

      {/* 主区：迷你字形（可点击高亮部首） + 两个核心指标 */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => hasRadical && setHighlightRadical((v) => !v)}
          disabled={!hasRadical}
          title={hasRadical ? (highlightRadical ? '点击取消部首高亮' : '点击高亮部首笔画') : '独体字无部首笔画'}
          aria-label={hasRadical ? '高亮部首笔画' : '独体字无部首笔画'}
          aria-pressed={highlightRadical}
          className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-white ${
            hasRadical ? 'cursor-pointer border-sage-300 hover:border-primary' : 'cursor-default border-border'
          }`}
        >
          <MiniGlyph data={data} style={style} radical={radical} highlight={highlightRadical} />
        </button>

        <div className="grid flex-1 grid-cols-2 gap-2">
          <div className="flex flex-col gap-1 rounded-lg bg-sage-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <PenLine className="h-3 w-3" /> 总笔画
            </div>
            <div className="text-2xl font-semibold leading-none text-primary">{total}</div>
          </div>
          <button
            type="button"
            onClick={() => hasRadical && setHighlightRadical((v) => !v)}
            disabled={!hasRadical}
            title={hasRadical ? '点击高亮部首笔画' : '独体字无部首笔画'}
            className={`flex flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors ${
              highlightRadical ? 'bg-amber-100' : 'bg-sage-50/50'
            } ${hasRadical ? 'cursor-pointer hover:bg-amber-50' : 'cursor-default'}`}
          >
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Layers className="h-3 w-3" /> 部首笔画
            </div>
            <div className="text-2xl font-semibold leading-none text-foreground">
              {hasRadical ? radical.length : '—'}
            </div>
          </button>
        </div>
      </div>

      {/* 逐笔长度条：宽度按长度比例，点击定位画布到该笔 */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> 逐笔长度</span>
          <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> 点击定位</span>
        </div>
        <div className="flex h-8 items-end gap-[3px]">
          {metrics.lengths.map((len, i) => (
            <button
              key={i}
              type="button"
              onClick={() => jumpToStroke(i + 1)}
              title={`第 ${i + 1} 笔 · 相对长度 ${Math.round((len / maxLen) * 100)}%`}
              aria-label={`定位到第 ${i + 1} 笔`}
              className="group flex h-full flex-1 items-end"
            >
              <span
                className={`w-full rounded-t transition-all group-hover:opacity-80 ${
                  highlightRadical && radical.includes(i) ? 'bg-amber-400' : 'bg-sage-400'
                }`}
                style={{ height: `${Math.max(8, (len / maxLen) * 100)}%` }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* 次级指标：轨迹总长 + 宽高比 */}
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-muted-foreground"><Ruler className="h-3 w-3" /> 轨迹总长</span>
          <span className="font-medium tabular-nums">{Math.round(metrics.totalLength)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-muted-foreground"><MoveHorizontal className="h-3 w-3" /> 字形比例</span>
          <span className="font-medium">{aspectLabel(metrics.aspect)}</span>
        </div>
      </div>

      {/* 紧凑脚注：完整说明收进 title，不占主视觉 */}
      <div
        className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground"
        title="总笔画源自 strokes.length；部首笔画源自 radStrokes 索引；长度与比例由 medians 轨迹点几何计算。独体字无 radStrokes，部首笔画记为 0。仅呈现客观统计，不做字形结构或笔画类型推断。"
      >
        <Info className="h-3 w-3 shrink-0" />
        <span>客观笔画统计 · 悬停查看数据来源</span>
      </div>
    </Card>
  )
}
