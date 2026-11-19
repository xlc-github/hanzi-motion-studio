import { useEffect, useRef } from 'react'
import { useStudioStore } from '@/store/useStudioStore'
import { useHanziWriter } from '@/hooks/useHanziWriter'
import { GridOverlay } from '@/components/GridOverlay'
import { Loader2, AlertCircle } from 'lucide-react'

interface HanziCanvasProps {
  char: string
  interactive?: boolean
  /** 预览显示尺寸覆盖；仅影响屏幕预览，不影响导出（导出走 store 的 canvas.size）。 */
  sizeOverride?: number
}

/**
 * 可复用的汉字动画画布。
 * - interactive=true：消费全局播放命令（中央舞台）
 * - interactive=false：静态预览（列表缩略图，未来扩展）
 */
export function HanziCanvas({ char, interactive = true, sizeOverride }: HanziCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const style = useStudioStore((s) => s.style)
  const anim = useStudioStore((s) => s.anim)
  const canvas = useStudioStore((s) => s.canvas)
  const configuredSize = canvas.size === 0 ? canvas.customSize : canvas.size
  const size = sizeOverride ?? configuredSize
  const playbackCmd = useStudioStore((s) => s.playbackCmd)
  const setStrokeProgress = useStudioStore((s) => s.setStrokeProgress)
  const currentStroke = useStudioStore((s) => s.currentStroke)
  const chars = useStudioStore((s) => s.chars)
  const missingRef = useRef(false)

  const currentCharItem = chars.find((c) => c.char === char)
  const isMissing = currentCharItem?.status === 'missing'

  const hw = useHanziWriter({
    containerRef,
    char,
    style,
    anim,
    size,
    onStrokeChange: (cur, total) => {
      setStrokeProgress(cur, total)
    },
    onMissing: () => {
      missingRef.current = true
    },
  })

  // 消费播放命令
  useEffect(() => {
    if (!interactive || !hw.ready) return
    switch (playbackCmd.type) {
      case 'play':
        hw.play()
        break
      case 'replay':
        hw.replay()
        break
      case 'restart':
        hw.showFull()
        break
      case 'next':
        hw.nextStroke()
        break
      case 'prev':
        hw.prevStroke()
        break
      case 'jump':
        hw.replayToStroke(playbackCmd.stroke ?? 0)
        break
      case 'pause':
        hw.pause()
        break
      case 'resume':
        hw.resume()
        break
    }
    // 仅在命令序号变化时触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackCmd.seq])

  // 循环开关：开启时启动循环，关闭时回到完整显示
  useEffect(() => {
    if (!interactive || !hw.ready) return
    if (anim.loop) hw.loopPlay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim.loop, hw.ready])

  const background = style.transparent
    ? 'repeating-conic-gradient(#e8e8e8 0% 25%, #ffffff 0% 50%) 50% / 20px 20px'
    : style.background

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative overflow-hidden shadow-sm"
        role="img"
        aria-label={`汉字「${char}」笔顺动画，共 ${hw.totalStrokes} 笔，当前第 ${currentStroke} 笔`}
        style={{
          width: size,
          height: size,
          maxWidth: '100%',
          background,
          borderRadius: style.borderRadius,
        }}
      >
        <GridOverlay style={style} size={size} />
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ width: size, height: size }}
        />
        {style.showStrokeNumbers && currentStroke > 0 && hw.ready && (
          <div
            className="pointer-events-none absolute"
            style={{ top: '4%', left: '4%' }}
            aria-label={`第 ${currentStroke} 笔`}
          >
            <div
              className="flex items-center justify-center rounded-full font-bold text-white shadow-md"
              style={{
                width: size * 0.085,
                height: size * 0.085,
                background: style.strokeColor,
                border: `${Math.max(1, size * 0.006)}px solid #fff`,
                fontSize: size * 0.05,
              }}
            >
              {currentStroke}
            </div>
          </div>
        )}
        {!hw.ready && !isMissing && (
          <div className="absolute inset-0 flex items-center justify-center text-sage-500">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
        {isMissing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <span className="text-sm">「{char}」暂无笔画数据</span>
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">共 {hw.totalStrokes} 笔</div>
    </div>
  )
}
