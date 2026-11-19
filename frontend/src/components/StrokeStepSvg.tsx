import type { StyleConfig } from '@/types'

interface StrokeStepSvgProps {
  strokes: string[]
  medians: number[][][]
  style: StyleConfig
  /** 显示到第几笔（1-based）：前 upto-1 笔笔画色、第 upto 笔强调色、其余轮廓色 */
  upto: number
  /** 画布像素尺寸 */
  size?: number
  /** 是否画当前笔序号圆圈 */
  showNumber?: boolean
  /** 是否画辅助格 */
  showGrid?: boolean
  className?: string
}

/**
 * 单步笔画 SVG（复刻后端 decompose._step_svg 逻辑，前端静态渲染）。
 * 坐标系：字库 x:0→1024, y:-124→900，Y 轴向上；
 * 用 translate(t, ty) scale(scale, -scale) 翻转到 SVG 正向。
 */
export function StrokeStepSvg({
  strokes,
  medians,
  style,
  upto,
  size = 96,
  showNumber = true,
  showGrid = false,
  className,
}: StrokeStepSvgProps) {
  const scale = style.glyphScale
  const t = (1 - scale) * 512
  const ty = 900 * scale + t
  const emphasize = style.emphasizeDecomposeStroke

  const paths = strokes.map((d, i) => {
    let color: string
    if (i < upto - 1) color = style.strokeColor
    else if (i === upto - 1) color = emphasize ? style.highlightColor : style.strokeColor
    else color = style.outlineColor
    return <path key={i} d={d} fill={color} />
  })

  // 序号圆圈：当前笔起点，坐标独立于字形 transform（防 Y 翻转倒置）
  let badge = null
  if (showNumber && medians[upto - 1]?.[0]) {
    const [mx, my] = medians[upto - 1][0]
    const rawCx = t + mx * scale
    const rawCy = ty - my * scale
    const cx = Math.max(42, Math.min(1024 - 42, rawCx))
    const cy = Math.max(42, Math.min(1024 - 42, rawCy))
    badge = (
      <g>
        <circle cx={cx} cy={cy} r={38} fill={style.strokeColor} stroke="#FFFFFF" strokeWidth={3} />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Arial, sans-serif"
          fontSize={44}
          fontWeight="bold"
          fill="#FFFFFF"
        >
          {upto}
        </text>
      </g>
    )
  }

  // 辅助格
  let grid = null
  if (showGrid && style.grid !== 'none') {
    const c = style.gridColor
    const w = style.gridLineWidth + 1
    const dash = `${1024 * 0.02} ${1024 * 0.02}`
    const lines = [
      <rect key="o" x={2} y={2} width={1020} height={1020} fill="none" stroke={c} strokeWidth={w} />,
      <line key="h" x1={2} y1={512} x2={1022} y2={512} stroke={c} strokeWidth={w} strokeDasharray={dash} />,
      <line key="v" x1={512} y1={2} x2={512} y2={1022} stroke={c} strokeWidth={w} strokeDasharray={dash} />,
    ]
    if (style.grid === 'mi') {
      lines.push(
        <line key="d1" x1={2} y1={2} x2={1022} y2={1022} stroke={c} strokeWidth={w} strokeDasharray={dash} />,
        <line key="d2" x1={1022} y1={2} x2={2} y2={1022} stroke={c} strokeWidth={w} strokeDasharray={dash} />,
      )
    }
    grid = <g>{lines}</g>
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      style={{ background: style.transparent ? 'transparent' : style.background, borderRadius: style.borderRadius }}
    >
      {grid}
      <g transform={`translate(${t.toFixed(2)},${ty.toFixed(2)}) scale(${scale},${-scale})`}>{paths}</g>
      {badge}
    </svg>
  )
}
