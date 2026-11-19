/** 从字库 medians 派生的客观笔画指标（零外部数据、可验证）。
 *  只做几何统计，不做笔画类型/结构等会误判的推断。 */
import type { CharData } from '@/types'

/** 计算单笔轨迹长度（字库坐标系相邻采样点距离之和）。 */
export function medianLength(points: number[][]): number {
  let sum = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0]
    const dy = points[i][1] - points[i - 1][1]
    sum += Math.hypot(dx, dy)
  }
  return sum
}

export interface CharMetrics {
  /** 每笔长度 */
  lengths: number[]
  /** 轨迹总长 */
  totalLength: number
  /** 最长笔索引 */
  longestIndex: number
  /** 字形宽高比（>1 偏宽，<1 偏高），基于所有 medians 点的包围盒 */
  aspect: number
  /** 包围盒宽 / 高（字库单位） */
  boxW: number
  boxH: number
}

/** 计算一个字的全部笔画指标。 */
export function computeMetrics(data: CharData | null): CharMetrics | null {
  if (!data || !data.medians || data.medians.length === 0) return null
  const lengths = data.medians.map(medianLength)
  const totalLength = lengths.reduce((a, b) => a + b, 0)
  let longestIndex = 0
  lengths.forEach((v, i) => {
    if (v > lengths[longestIndex]) longestIndex = i
  })

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const median of data.medians) {
    for (const [x, y] of median) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  const boxW = maxX - minX
  const boxH = maxY - minY
  const aspect = boxH > 0 ? boxW / boxH : 1

  return { lengths, totalLength, longestIndex, aspect, boxW, boxH }
}

/** 依据宽高比给出中文描述（纯客观描述，不做结构推断）。 */
export function aspectLabel(aspect: number): string {
  if (aspect > 1.15) return '偏宽'
  if (aspect < 0.85) return '偏高'
  return '近方正'
}
