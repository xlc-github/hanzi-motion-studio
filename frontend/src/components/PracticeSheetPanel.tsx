import { useRef } from 'react'
import type { CharData, StyleConfig } from '@/types'
import { Button } from '@/components/ui/button'
import { useStudioStore } from '@/store/useStudioStore'
import { Printer, Download, FileText } from 'lucide-react'

interface PracticeSheetPanelProps {
  char: string
  data: CharData
  style: StyleConfig
}

type CellMode = 'full' | 'step' | 'trace'

const PAGE_W = 794
const PAGE_H = 1123
const MARGIN = 48

/** 生成田字格单元（含内容），摆放于 (x, y)，边长 cell。 */
function cell(
  data: CharData,
  style: StyleConfig,
  mode: CellMode,
  upto: number,
  x: number,
  y: number,
  cell: number,
) {
  const scale = style.glyphScale * 0.96
  const t = (1 - scale) * 512
  const ty = 900 * scale + t
  const gc = style.gridColor
  const gw = style.gridLineWidth + 1
  const dash = `${1024 * 0.02} ${1024 * 0.02}`

  let paths
  if (mode === 'full') {
    paths = data.strokes.map((d, i) => <path key={i} d={d} fill={style.strokeColor} />)
  } else if (mode === 'trace') {
    paths = data.strokes.map((d, i) => <path key={i} d={d} fill={style.outlineColor} opacity={0.55} />)
  } else {
    paths = data.strokes.map((d, i) => {
      const color = i < upto - 1 ? style.strokeColor : i === upto - 1 ? style.highlightColor : style.outlineColor
      return <path key={i} d={d} fill={color} />
    })
  }

  let badge = null
  if (mode === 'step' && style.showStrokeNumbers && data.medians[upto - 1]?.[0]) {
    const [mx, my] = data.medians[upto - 1][0]
    const cx = Math.max(42, Math.min(1024 - 42, t + mx * scale))
    const cy = Math.max(42, Math.min(1024 - 42, ty - my * scale))
    badge = (
      <g>
        <circle cx={cx} cy={cy} r={38} fill={style.strokeColor} stroke="#FFFFFF" strokeWidth={3} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontFamily="Arial, sans-serif" fontSize={44} fontWeight="bold" fill="#FFFFFF">{upto}</text>
      </g>
    )
  }

  // 用嵌套 svg 建立独立 1024 坐标系，内部坐标换算与 StrokeStepSvg 完全一致
  return (
    <g key={`${mode}-${upto}-${x}-${y}`}>
      <rect x={x} y={y} width={cell} height={cell} fill="#FFFFFF" stroke={gc} strokeWidth={gw} />
      <line x1={x} y1={y + cell / 2} x2={x + cell} y2={y + cell / 2} stroke={gc} strokeWidth={gw} strokeDasharray={dash} />
      <line x1={x + cell / 2} y1={y} x2={x + cell / 2} y2={y + cell} stroke={gc} strokeWidth={gw} strokeDasharray={dash} />
      <svg x={x} y={y} width={cell} height={cell} viewBox="0 0 1024 1024">
        <g transform={`translate(${t.toFixed(2)},${ty.toFixed(2)}) scale(${scale},${-scale})`}>{paths}</g>
        {badge}
      </svg>
    </g>
  )
}

/**
 * 田字格练习页：A4 竖版整页 SVG。
 * 结构：范字 → 逐笔分解 → 描红空格。可直接打印或导出 SVG。
 */
export function PracticeSheetPanel({ char, data, style }: PracticeSheetPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const addTask = useStudioStore((s) => s.addTask)
  const total = data.strokes.length
  const contentW = PAGE_W - MARGIN * 2

  const cells: React.ReactNode[] = []

  // 标题
  cells.push(
    <text key="title" x={PAGE_W / 2} y={78} textAnchor="middle" fontSize={40} fontWeight="bold" fill="#2C2C2A" fontFamily="sans-serif">
      {char} · 笔顺描红练习
    </text>,
  )
  cells.push(
    <text key="sub" x={PAGE_W / 2} y={112} textAnchor="middle" fontSize={18} fill="#5F5E5A" fontFamily="sans-serif">
      共 {total} 笔 · 姓名：____________　日期：____________
    </text>,
  )

  let cursorY = 148

  // —— 范字区（大字 + 说明）——
  const bigCell = 180
  cells.push(cell(data, style, 'full', 0, MARGIN, cursorY, bigCell))
  cells.push(
    <text key="fanlabel" x={MARGIN + bigCell + 24} y={cursorY + bigCell / 2 - 6} fontSize={26} fontWeight="bold" fill="#2C2C2A" fontFamily="sans-serif">
      范字
    </text>,
  )
  cells.push(
    <text key="fantip" x={MARGIN + bigCell + 24} y={cursorY + bigCell / 2 + 28} fontSize={16} fill="#5F5E5A" fontFamily="sans-serif">
      观察每一笔的起笔与走向
    </text>,
  )
  cursorY += bigCell + 40

  // —— 逐笔分解区 ——
  cells.push(<text key="steptitle" x={MARGIN} y={cursorY} fontSize={22} fontWeight="bold" fill="#2C2C2A" fontFamily="sans-serif">一、笔顺分解</text>)
  cursorY += 20
  const stepCell = 104
  const stepGap = 16
  const stepCols = Math.floor((contentW + stepGap) / (stepCell + stepGap))
  for (let i = 0; i < total; i++) {
    const col = i % stepCols
    const row = Math.floor(i / stepCols)
    const x = MARGIN + col * (stepCell + stepGap)
    const y = cursorY + row * (stepCell + stepGap)
    cells.push(cell(data, style, 'step', i + 1, x, y, stepCell))
  }
  const stepRows = Math.ceil(total / stepCols)
  cursorY += stepRows * (stepCell + stepGap) + 28

  // —— 描红空格区（填充满余下页面，至少 2 行）——
  cells.push(<text key="tracettitle" x={MARGIN} y={cursorY} fontSize={22} fontWeight="bold" fill="#2C2C2A" fontFamily="sans-serif">二、描红练习</text>)
  cursorY += 20
  const traceCell = 108
  const traceGap = 18
  const traceCols = Math.floor((contentW + traceGap) / (traceCell + traceGap))
  const maxRows = Math.max(2, Math.floor((PAGE_H - MARGIN - cursorY) / (traceCell + traceGap)))
  for (let i = 0; i < traceCols * maxRows; i++) {
    const col = i % traceCols
    const row = Math.floor(i / traceCols)
    const x = MARGIN + col * (traceCell + traceGap)
    const y = cursorY + row * (traceCell + traceGap)
    cells.push(cell(data, style, 'trace', 0, x, y, traceCell))
  }

  const getSvgString = () => (svgRef.current ? new XMLSerializer().serializeToString(svgRef.current) : '')

  /** 导出 PDF：把 A4 SVG 交给后端转矢量 PDF，任务进导出队列可追踪/重试。 */
  const handlePdf = () => {
    const svg = getSvgString()
    if (!svg) return
    // 后端 wrapper 已用 CSS 强制 210mm×297mm；这里把 100% 换成固定像素，
    // 避免部分浏览器中 viewBox + 百分比宽导致的 PDF 缩放偏差。
    const pdfSvg = svg.replace('width="100%"', `width="${PAGE_W}" height="${PAGE_H}"`)
    const id = addTask({
      chars: [char], format: 'pdf', status: 'pending', progress: 0,
      kind: 'pdf', pdfContext: { char, svg: pdfSvg },
    })
    import('@/lib/exportDispatcher').then((m) => m.dispatchPracticePdf(id, { char, svg: pdfSvg }))
  }

  const handleExport = () => {
    const svg = getSvgString()
    if (!svg) return
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg}`], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hanzi_${char}_练习页.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const svg = getSvgString()
    if (!svg) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${char} 笔顺练习页</title>` +
      `<style>@page{size:A4;margin:0}html,body{margin:0;padding:0}svg{display:block;width:100%;height:auto}</style>` +
      `</head><body>${svg}</body></html>`,
    )
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="mx-auto w-full max-w-[420px] shrink-0 overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} xmlns="http://www.w3.org/2000/svg">
          <rect width={PAGE_W} height={PAGE_H} fill="#FFFFFF" />
          {cells}
        </svg>
      </div>
      <div className="flex-1 space-y-3">
        <h4 className="text-sm font-semibold">「{char}」A4 描红练习页</h4>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          含范字、{total} 步笔顺分解和整页描红空格。A4 竖版，可直接打印用于课堂或家庭练习。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handlePdf}>
            <FileText className="h-4 w-4" /> 导出 PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> 打印
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" /> 导出 SVG
          </Button>
        </div>
        <div className="rounded-lg bg-sage-50 p-3 text-[10px] leading-relaxed text-sage-700">
          打印时请在浏览器对话框中选择「A4、无边距、纵向」，以获得最佳效果。所有内容由本地笔画数据实时生成，无需联网。
        </div>
      </div>
    </div>
  )
}
