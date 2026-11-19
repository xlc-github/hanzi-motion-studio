import type { CharData, StyleConfig } from '@/types'

interface StrokePathPanelProps {
  char: string
  data: CharData
  style: StyleConfig
}

/**
 * 笔顺路径图：用 medians 轨迹点画每笔的书写走向，
 * 起笔点画编号圆，末点画小箭头方向。字形轮廓作底。
 * 全部基于本地 medians 数据，零外部依赖。
 */
export function StrokePathPanel({ char, data, style }: StrokePathPanelProps) {
  const scale = style.glyphScale
  const t = (1 - scale) * 512
  const ty = 900 * scale + t
  const total = data.medians.length

  // 起笔点序号圆（坐标换算后独立于字形 transform，防倒置）
  const markers = data.medians.map((median, i) => {
    if (!median?.[0]) return null
    const [mx, my] = median[0]
    const cx = Math.max(36, Math.min(1024 - 36, t + mx * scale))
    const cy = Math.max(36, Math.min(1024 - 36, ty - my * scale))
    return (
      <g key={`m${i}`}>
        <circle cx={cx} cy={cy} r={34} fill={style.strokeColor} stroke="#FFFFFF" strokeWidth={3} />
        <text
          x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fontFamily="Arial, sans-serif" fontSize={40} fontWeight="bold" fill="#FFFFFF"
        >
          {i + 1}
        </text>
      </g>
    )
  })

  // 每笔轨迹：多段 polyline，配合箭头标记书写方向
  const traces = data.medians.map((median, i) => {
    if (!median || median.length < 2) return null
    const pts = median
      .map(([mx, my]) => `${(t + mx * scale).toFixed(1)},${(ty - my * scale).toFixed(1)}`)
      .join(' ')
    return (
      <polyline
        key={`p${i}`}
        points={pts}
        fill="none"
        stroke={style.highlightColor}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${180 + i * 12} ${120}`}
        opacity={0.9}
      />
    )
  })

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="shrink-0 rounded-xl border border-border bg-white p-3">
        <svg width={280} height={280} viewBox="0 0 1024 1024">
          <rect width={1024} height={1024} fill={style.transparent ? '#FFFFFF' : style.background} />
          {/* 字形轮廓作底 */}
          <g transform={`translate(${t.toFixed(2)},${ty.toFixed(2)}) scale(${scale},${-scale})`}>
            {data.strokes.map((d, i) => (
              <path key={i} d={d} fill={style.outlineColor} opacity={0.5} />
            ))}
          </g>
          {/* 轨迹连线 */}
          {traces}
          {/* 起笔点编号 */}
          {markers}
        </svg>
      </div>

      <div className="flex-1 space-y-3">
        <div>
          <h4 className="text-sm font-semibold">「{char}」笔顺路径 · 共 {total} 笔</h4>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            每条曲线是该笔的真实书写轨迹，圆点数字标出起笔顺序。虚线沿轨迹方向延伸，指向收笔。
          </p>
        </div>
        <div className="space-y-2 rounded-lg bg-sage-50 p-3">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: style.strokeColor }} />
            <span>编号圆 = 起笔位置与顺序</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="inline-block h-0.5 w-5" style={{ background: style.highlightColor }} />
            <span>虚线 = 运笔轨迹方向</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: style.outlineColor }} />
            <span>浅灰 = 字形轮廓底图</span>
          </div>
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          路径数据取自字库 medians 字段（每笔的轨迹采样点），与动画书写方向完全一致。
        </p>
      </div>
    </div>
  )
}
