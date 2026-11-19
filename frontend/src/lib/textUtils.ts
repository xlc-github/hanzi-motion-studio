/** 文本处理工具：提取汉字、去重、去标点 */

/** 判断是否为汉字（基本区 + 扩展 A） */
export function isHanzi(ch: string): boolean {
  return /[\u4e00-\u9fff]/.test(ch)
}

/**
 * 从任意文本中提取汉字字符（含标点清洗）
 * - 去除标点符号、数字、字母、空白、emoji
 * - 保持出现顺序
 */
export function extractHanzi(text: string): string[] {
  const result: string[] = []
  for (const ch of text) {
    if (isHanzi(ch)) result.push(ch)
  }
  return result
}

/** 去重并保持顺序 */
export function uniqueChars(chars: string[]): string[] {
  return Array.from(new Set(chars))
}

/** 预设课文生字集合 */
export const PRESET_LESSONS: { name: string; chars: string[] }[] = [
  { name: '《火烧云》', chars: ['烧', '威', '武', '镇', '盈', '彤'] },
  { name: '《肥皂泡》', chars: ['皂', '廊', '碗', '若', '透', '娇', '扯'] },
  { name: '《观潮》', chars: ['潮', '据', '堤', '阔', '盼', '滚', '顿'] },
  { name: '《爬山虎的脚》', chars: ['虎', '操', '占', '嫩', '顺', '均', '叠'] },
]
