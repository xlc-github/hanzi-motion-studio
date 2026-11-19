import type { CharData } from '@/types'

/** 字库内存缓存 */
const cache = new Map<string, CharData>()
/** 加载失败缓存（避免反复请求缺字） */
const missingCache = new Set<string>()

/**
 * 加载汉字笔画数据：仅本地字库。
 * 项目随包内置 9534 个 CJK 基本区汉字，纯离线可用；
 * 有意不设 CDN 回退，与「离线可用」承诺及后端导出的外部请求阻断策略保持一致。
 * 可作为 Hanzi Writer 的 charDataLoader 使用。
 */
export async function loadCharData(char: string): Promise<CharData> {
  if (cache.has(char)) return cache.get(char)!

  const localUrl = `/hanzi/${encodeURIComponent(char)}.json`
  try {
    const res = await fetch(localUrl)
    if (res.ok) {
      const data = (await res.json()) as CharData
      if (validateCharData(data)) {
        cache.set(char, data)
        return data
      }
    }
  } catch {
    // 本地加载失败，按缺字处理
  }

  missingCache.add(char)
  throw new Error(`没有找到「${char}」的笔画数据`)
}

/** 校验字库数据格式是否合法 */
export function validateCharData(data: unknown): data is CharData {
  if (!data || typeof data !== 'object') return false
  const d = data as CharData
  return (
    Array.isArray(d.strokes) &&
    d.strokes.length > 0 &&
    d.strokes.every((s) => typeof s === 'string') &&
    Array.isArray(d.medians) &&
    d.medians.length === d.strokes.length
  )
}

/** 判断某字是否缺数据（同步查缓存） */
export function isKnownMissing(char: string): boolean {
  return missingCache.has(char)
}

/** 从缓存同步获取某字的笔画数（未缓存返回 0） */
export function getCachedStrokeCount(char: string): number {
  return cache.get(char)?.strokes.length ?? 0
}

/** 从缓存同步获取某字的部首笔画数（未缓存或无部首返回 0） */
export function getCachedRadStrokeCount(char: string): number {
  return cache.get(char)?.radStrokes?.length ?? 0
}

/** 预取多个字的数据（用于批量校验） */
export async function prefetchChars(chars: string[]): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {}
  await Promise.all(
    chars.map(async (c) => {
      try {
        await loadCharData(c)
        results[c] = true
      } catch {
        results[c] = false
      }
    }),
  )
  return results
}
