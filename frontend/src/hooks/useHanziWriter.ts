import { useCallback, useEffect, useRef, useState } from 'react'
import HanziWriter from 'hanzi-writer'
import type { StyleConfig, AnimConfig } from '@/types'
import { loadCharData } from '@/lib/hanziLoader'

interface UseHanziWriterArgs {
  containerRef: React.RefObject<HTMLDivElement>
  char: string
  style: StyleConfig
  anim: AnimConfig
  size: number
  onStrokeChange?: (current: number, total: number) => void
  onComplete?: () => void
  onMissing?: (char: string) => void
}

/**
 * 封装 Hanzi Writer 实例生命周期与全部播放控制。
 * 所有方法均基于官方真实 API，逐笔定位通过状态重放实现。
 */
export function useHanziWriter({
  containerRef,
  char,
  style,
  anim,
  size,
  onStrokeChange,
  onComplete,
  onMissing,
}: UseHanziWriterArgs) {
  const writerRef = useRef<HanziWriter | null>(null)
  const [ready, setReady] = useState(false)
  const [totalStrokes, setTotalStrokes] = useState(0)
  const currentStrokeRef = useRef(0)
  const cancelledRef = useRef(false)
  const loopRef = useRef(false)
  const playTokenRef = useRef(0)

  // 保存最新回调，避免闭包陈旧
  const callbacksRef = useRef({ onStrokeChange, onComplete, onMissing })
  callbacksRef.current = { onStrokeChange, onComplete, onMissing }

  /** 计算 Hanzi Writer 的 padding（考虑字形缩放） */
  const computePadding = useCallback(() => {
    // glyphScale 越大字形越大 → padding 越小
    const base = style.padding
    const scalePad = Math.round(((1 - style.glyphScale) / 0.5) * (size * 0.18))
    return Math.max(2, base - 20 + scalePad)
  }, [style.padding, style.glyphScale, size])

  /** 创建 writer 实例 */
  const createWriter = useCallback(() => {
    const el = containerRef.current
    if (!el || !char) return
    cancelledRef.current = false
    el.innerHTML = ''

    const writer = HanziWriter.create(el, char, {
      width: size,
      height: size,
      padding: computePadding(),
      showOutline: true,
      showCharacter: true,
      strokeColor: style.strokeColor,
      outlineColor: style.outlineColor,
      highlightColor: style.highlightColor,
      strokeAnimationSpeed: anim.speed,
      delayBetweenStrokes: anim.strokeGap,
      delayBetweenLoops: anim.loopGap,
      strokeFadeDuration: 0,
      charDataLoader: (c: string) =>
        loadCharData(c).catch((e) => {
          callbacksRef.current.onMissing?.(c)
          throw e
        }),
      onLoadCharDataSuccess: (data) => {
        if (cancelledRef.current) return
        const count = (data as { strokes: string[] }).strokes?.length ?? 0
        setTotalStrokes(count)
        currentStrokeRef.current = 0
        callbacksRef.current.onStrokeChange?.(0, count)
        setReady(true)
      },
      onLoadCharDataError: () => {
        if (cancelledRef.current) return
        callbacksRef.current.onMissing?.(char)
      },
    } as Parameters<typeof HanziWriter.create>[2])
    writerRef.current = writer
  }, [containerRef, char, size, computePadding, style, anim])

  // char 或 size 变化：重建实例
  useEffect(() => {
    createWriter()
    return () => {
      cancelledRef.current = true
      writerRef.current = null
    }
  }, [char, size, createWriter])

  // 样式 / 动画参数变化：实时更新，不重建
  useEffect(() => {
    const w = writerRef.current
    if (!w || !ready) return
    w.updateColor('strokeColor', style.strokeColor)
    w.updateColor('outlineColor', style.outlineColor)
    w.updateColor('highlightColor', style.highlightColor)
  }, [style.strokeColor, style.outlineColor, style.highlightColor, ready])

  useEffect(() => {
    const w = writerRef.current
    if (!w || !ready) return
    w.updateDimensions({ width: size, height: size, padding: computePadding() })
  }, [style.glyphScale, style.padding, size, computePadding, ready])

  /** 完整书写动画：逐笔串联，精确跟踪每一笔进度 */
  const play = useCallback(async () => {
    const w = writerRef.current
    if (!w || !ready || totalStrokes === 0) return
    loopRef.current = false
    const myToken = ++playTokenRef.current
    w.hideCharacter({ duration: 0 })
    w.showOutline({ duration: 0 })
    currentStrokeRef.current = 0
    callbacksRef.current.onStrokeChange?.(0, totalStrokes)

    for (let i = 0; i < totalStrokes; i++) {
      if (myToken !== playTokenRef.current) return // 已被新的播放/切换打断
      if (style.highlightCurrentStroke && i > 0) {
        // 高亮上一笔作为"当前书写笔"的视觉反馈
        w.highlightStroke(i - 1)
      }
      await w.animateStroke(i)
      currentStrokeRef.current = i + 1
      callbacksRef.current.onStrokeChange?.(i + 1, totalStrokes)
      // animateStroke 不含笔间停顿，手动插入（最后一笔后不停顿）
      if (i < totalStrokes - 1 && anim.strokeGap > 0) {
        await new Promise((r) => setTimeout(r, anim.strokeGap))
      }
    }
    if (myToken === playTokenRef.current) {
      callbacksRef.current.onComplete?.()
    }
  }, [ready, totalStrokes, style.highlightCurrentStroke, anim.strokeGap])

  /** 重新播放（等同 play，语义区分） */
  const replay = useCallback(() => play(), [play])

  /** 循环播放 */
  const loopPlay = useCallback(() => {
    const w = writerRef.current
    if (!w || !ready) return
    playTokenRef.current++
    loopRef.current = true
    w.hideCharacter({ duration: 0 })
    w.showOutline({ duration: 0 })
    w.loopCharacterAnimation()
  }, [ready])

  /**
   * 重放到指定笔画（0-based）：显示前 n 笔，其余保持轮廓。
   * 通过 hideCharacter + 顺序 animateStroke 实现，不依赖不存在的 API。
   */
  const replayToStroke = useCallback(
    (target: number) => {
      const w = writerRef.current
      if (!w || !ready || totalStrokes === 0) return
      const t = Math.max(0, Math.min(target, totalStrokes))
      playTokenRef.current++
      loopRef.current = false
      w.hideCharacter({ duration: 0 })
      w.showOutline({ duration: 0 })
      currentStrokeRef.current = t
      callbacksRef.current.onStrokeChange?.(t, totalStrokes)
      // 顺序重放 0..t-1，t 作为当前笔高亮
      for (let i = 0; i <= t - 1; i++) {
        w.animateStroke(i, { duration: 0 } as never)
      }
      if (t > 0 && style.highlightCurrentStroke) {
        w.highlightStroke(t - 1)
      }
    },
    [ready, totalStrokes, style.highlightCurrentStroke],
  )

  /** 下一笔 */
  const nextStroke = useCallback(() => {
    replayToStroke(currentStrokeRef.current + 1)
  }, [replayToStroke])

  /** 上一笔 */
  const prevStroke = useCallback(() => {
    replayToStroke(currentStrokeRef.current - 1)
  }, [replayToStroke])

  /** 显示完整字（静态） */
  const showFull = useCallback(() => {
    const w = writerRef.current
    if (!w || !ready) return
    playTokenRef.current++
    w.hideOutline({ duration: 0 })
    w.showCharacter({ duration: 0 })
    currentStrokeRef.current = totalStrokes
    callbacksRef.current.onStrokeChange?.(totalStrokes, totalStrokes)
  }, [ready, totalStrokes])

  const pause = useCallback(() => writerRef.current?.pauseAnimation(), [])
  const resume = useCallback(() => writerRef.current?.resumeAnimation(), [])

  return {
    writer: writerRef,
    ready,
    totalStrokes,
    play,
    replay,
    loopPlay,
    nextStroke,
    prevStroke,
    replayToStroke,
    showFull,
    pause,
    resume,
  }
}
