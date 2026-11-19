/**
 * 渲染页入口：供后端 Playwright 加载。
 * 通过 URL 查询参数注入与预览完全相同的配置，逐帧采集动画。
 * 暴露 window.__hm 控制接口供 Playwright 调用。
 */
import HanziWriter from 'hanzi-writer'
import { loadCharData } from '@/lib/hanziLoader'
import type { StyleConfig, AnimConfig } from '@/types'

interface RenderParams {
  char: string
  style: StyleConfig
  anim: AnimConfig
  size: number
  /** 采集慢放系数：动画时间轴整体拉长该倍数，便于逐帧截图采到足够画面 */
  scale: number
}

function parseParams(): RenderParams {
  const q = new URLSearchParams(location.search)
  const defaults: StyleConfig = {
    grid: 'none', gridColor: '#C0392B', gridLineWidth: 1,
    background: '#FDF9F0', transparent: true, strokeColor: '#C0392B',
    outlineColor: '#D8D3C8', highlightColor: '#E8A33D', glyphScale: 0.82,
    padding: 20, borderRadius: 0, highlightFirstStroke: false,
    highlightCurrentStroke: true, showStrokeNumbers: true,
    emphasizeDecomposeStroke: true,
  }
  const animDefaults: AnimConfig = {
    speed: 1, strokeGap: 280, loopGap: 1200, loop: false,
    headPause: 400, tailPause: 800, fps: 30,
  }
  const style = { ...defaults, ...JSON.parse(q.get('style') || '{}') } as StyleConfig
  const anim = { ...animDefaults, ...JSON.parse(q.get('anim') || '{}') } as AnimConfig
  return {
    char: q.get('char') || '',
    style,
    anim,
    size: Number(q.get('size') || 512),
    scale: Math.max(1, Number(q.get('scale') || 1)),
  }
}

declare global {
  interface Window {
    __hm?: {
      ready: boolean
      totalStrokes: number
      start: () => void
      showFull: () => Promise<void>
      captureFrame: () => string
      isDone: () => boolean
      getDurationMs: () => number
    }
    __hmDone?: boolean
    __hmStartAt?: number
  }
}

function drawGrid(params: RenderParams) {
  const svg = document.getElementById('grid') as unknown as SVGSVGElement
  const { style, size } = params
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
  if (style.grid === 'none') { svg.innerHTML = ''; return }
  const c = style.gridColor
  const w = style.gridLineWidth
  const mid = size / 2
  const dash = `stroke-dasharray="${size * 0.02} ${size * 0.02}"`
  let html = `<rect x="2" y="2" width="${size - 4}" height="${size - 4}" fill="none" stroke="${c}" stroke-width="${w}"/>`
  html += `<line x1="2" y1="${mid}" x2="${size - 2}" y2="${mid}" stroke="${c}" stroke-width="${w}" ${dash}/>`
  html += `<line x1="${mid}" y1="2" x2="${mid}" y2="${size - 2}" stroke="${c}" stroke-width="${w}" ${dash}/>`
  if (style.grid === 'mi') {
    html += `<line x1="2" y1="2" x2="${size - 2}" y2="${size - 2}" stroke="${c}" stroke-width="${w}" ${dash}/>`
    html += `<line x1="${size - 2}" y1="2" x2="2" y2="${size - 2}" stroke="${c}" stroke-width="${w}" ${dash}/>`
  }
  svg.innerHTML = html
}

async function main() {
  const params = parseParams()
  const { char, style, anim, size, scale } = params
  window.__hmDone = false

  const stage = document.getElementById('stage')!
  stage.style.width = `${size}px`
  stage.style.height = `${size}px`
  stage.style.background = style.transparent ? 'transparent' : style.background
  stage.style.borderRadius = `${style.borderRadius}px`
  drawGrid(params)

  const scalePad = Math.round(((1 - style.glyphScale) / 0.5) * (size * 0.18))
  const padding = Math.max(2, style.padding - 20 + scalePad)

  document.body.style.width = `${size}px`
  document.body.style.height = `${size}px`

  const writer = HanziWriter.create(document.getElementById('writer')!, char, {
    width: size,
    height: size,
    padding,
    showOutline: true,
    showCharacter: true,
    strokeColor: style.strokeColor,
    outlineColor: style.outlineColor,
    highlightColor: style.highlightColor,
    // 采集时整体慢放 scale 倍：单笔绘制变慢、笔间隔变长。
    // 这样真实时间轴被拉长，Playwright 截图（每帧约 77ms）能采到足够多的不同画面。
    strokeAnimationSpeed: anim.speed / scale,
    delayBetweenStrokes: anim.strokeGap * scale,
    strokeFadeDuration: 0,
    renderer: 'svg',
    charDataLoader: (c: string) => loadCharData(c),
  })

  // 等待字形数据加载与初始渲染
  await new Promise<void>((resolve) => {
    const check = () => {
      // Hanzi Writer 会在数据加载后往 writer 容器插入 svg
      if (document.querySelector('#writer svg')) resolve()
      else requestAnimationFrame(check)
    }
    check()
  })
  // 多等一帧确保 outline 渲染完成
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

  // 初始状态：隐藏字形，只保留浅灰轮廓（书写前的状态）
  writer.hideCharacter({ duration: 0 })
  writer.showOutline({ duration: 0 })
  await new Promise((r) => requestAnimationFrame(r))

  const totalStrokes = (await (writer as unknown as { getCharacterData(): Promise<{ strokes: unknown[] }> }).getCharacterData()).strokes.length

  window.__hm = {
    ready: true,
    totalStrokes,
    start: () => {
      window.__hmDone = false
      window.__hmStartAt = performance.now()
      writer.hideCharacter({ duration: 0 })
      writer.showOutline({ duration: 0 })
      writer.animateCharacter({
        onComplete: () => { window.__hmDone = true },
      })
    },
    showFull: async () => {
      writer.hideOutline({ duration: 0 })
      writer.showCharacter({ duration: 0 })
      await new Promise((r) => setTimeout(r, 100))
    },
    captureFrame: () => {
      // 序列化当前 stage 为 SVG foreignObject（由后端转为 PNG）
      const clone = stage.cloneNode(true) as HTMLElement
      clone.style.background = style.transparent ? 'transparent' : style.background
      const xml = new XMLSerializer().serializeToString(clone)
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`
    },
    isDone: () => !!window.__hmDone,
    // 返回在“用户设定速度”下的真实书写时长（毫秒）。
    // 采集时动画被慢放 scale 倍，因此实际耗时除以 scale 还原。
    // 这样后端据此计算目标帧数，导出动画的播放速度才与预览一致。
    getDurationMs: () => {
      const elapsed = performance.now() - (window.__hmStartAt ?? performance.now())
      return elapsed / scale
    },
  }
}

main().catch((e) => {
  console.error('render init failed', e)
})
