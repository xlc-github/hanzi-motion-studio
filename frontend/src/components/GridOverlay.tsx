import type { StyleConfig } from '@/types'

interface GridOverlayProps {
  style: StyleConfig
  size: number
}

/**
 * 练字格 SVG 覆盖层：田字格 / 米字格 / 无。
 * 独立渲染，与 Hanzi Writer 字形共用坐标系（0..size）。
 */
export function GridOverlay({ style, size }: GridOverlayProps) {
  if (style.grid === 'none') return null

  const c = style.gridColor
  const w = style.gridLineWidth
  const pad = 2
  const m = size - pad * 2
  const mid = size / 2

  const dashed = { strokeDasharray: `${size * 0.02} ${size * 0.02}` }

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      {/* 外框 */}
      <rect
        x={pad}
        y={pad}
        width={m}
        height={m}
        fill="none"
        stroke={c}
        strokeWidth={w}
      />
      {/* 水平中线 */}
      <line x1={pad} y1={mid} x2={size - pad} y2={mid} stroke={c} strokeWidth={w} {...dashed} />
      {/* 垂直中线 */}
      <line x1={mid} y1={pad} x2={mid} y2={size - pad} stroke={c} strokeWidth={w} {...dashed} />
      {/* 米字格对角线 */}
      {style.grid === 'mi' && (
        <>
          <line x1={pad} y1={pad} x2={size - pad} y2={size - pad} stroke={c} strokeWidth={w} {...dashed} />
          <line x1={size - pad} y1={pad} x2={pad} y2={size - pad} stroke={c} strokeWidth={w} {...dashed} />
        </>
      )}
    </svg>
  )
}
