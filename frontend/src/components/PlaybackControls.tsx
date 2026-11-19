import { useStudioStore } from '@/store/useStudioStore'
import { Button } from '@/components/ui/button'
import {
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Eye,
  Pause,
  PlayCircle,
} from 'lucide-react'

export function PlaybackControls() {
  const send = useStudioStore((s) => s.sendPlayback)
  const currentStroke = useStudioStore((s) => s.currentStroke)
  const totalStrokes = useStudioStore((s) => s.totalStrokes)
  const anim = useStudioStore((s) => s.anim)
  const setAnim = useStudioStore((s) => s.setAnim)
  const chars = useStudioStore((s) => s.chars)
  const currentIndex = useStudioStore((s) => s.currentIndex)
  const hasChar = chars.length > 0 && chars[currentIndex]?.status !== 'missing'

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" onClick={() => send('play')} disabled={!hasChar}>
          <Play className="h-4 w-4" /> 播放
        </Button>
        <Button size="sm" variant="secondary" onClick={() => send('replay')} disabled={!hasChar}>
          <RotateCcw className="h-4 w-4" /> 重播
        </Button>
        <div className="mx-1 h-6 w-px bg-border" />
        <Button size="icon" variant="outline" onClick={() => send('prev')} disabled={!hasChar} title="上一笔" aria-label="上一笔">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={() => send('next')} disabled={!hasChar} title="下一笔" aria-label="下一笔">
          <SkipForward className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => send('restart')} disabled={!hasChar} title="显示完整字" aria-label="显示完整字">
          <Eye className="h-4 w-4" /> 完整字
        </Button>
        <div className="mx-1 h-6 w-px bg-border" />
        <Button size="icon" variant="ghost" onClick={() => send('pause')} disabled={!hasChar} title="暂停" aria-label="暂停">
          <Pause className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => send('resume')} disabled={!hasChar} title="继续" aria-label="继续">
          <PlayCircle className="h-4 w-4" />
        </Button>
        <button
          onClick={() => setAnim({ loop: !anim.loop })}
          className={`ml-1 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
            anim.loop
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-white text-muted-foreground hover:border-sage-300'
          }`}
          disabled={!hasChar}
          aria-pressed={anim.loop}
          aria-label="循环播放"
        >
          循环播放
        </button>
      </div>

      {/* 笔画进度 */}
      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-xs text-muted-foreground">笔画进度</span>
        <div
          className="flex flex-1 gap-1"
          role="progressbar"
          aria-label="笔画书写进度"
          aria-valuemin={0}
          aria-valuemax={totalStrokes}
          aria-valuenow={currentStroke}
          aria-valuetext={`第 ${currentStroke} 笔，共 ${totalStrokes} 笔`}
        >
          {Array.from({ length: totalStrokes }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < currentStroke ? 'bg-primary' : 'bg-sage-100'
              }`}
            />
          ))}
          {totalStrokes === 0 && <div className="h-1.5 w-full rounded-full bg-sage-100" />}
        </div>
        <span className="whitespace-nowrap text-xs font-medium text-primary">
          {currentStroke} / {totalStrokes}
        </span>
      </div>
    </div>
  )
}
