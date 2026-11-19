import { useEffect, useState } from 'react'
import type { CharData } from '@/types'
import { loadCharData } from '@/lib/hanziLoader'

/**
 * 加载当前字的完整笔画数据（strokes / medians / radStrokes）到 React state。
 * loadCharData 自带内存缓存，重复加载开销极低。
 * 供分解缩略墙、路径图、练习页等静态渲染复用。
 */
export function useCharData(char: string | undefined) {
  const [data, setData] = useState<CharData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!char) {
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    loadCharData(char)
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [char])

  return { data, loading }
}
