// 两份 JSON 深度合并：对象递归合并，数组按策略处理，标量按优先级取值
import { tryParseJson } from './json'
import type { TransformResult } from './jsonTransform'

export type MergeArrayStrategy = 'replace' | 'concat' | 'union'
export type MergePrefer = 'left' | 'right'

export interface MergeOptions {
  arrayStrategy?: MergeArrayStrategy
  prefer?: MergePrefer
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

const dedupeArray = (items: unknown[]): unknown[] => {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = JSON.stringify(item) ?? 'undefined'
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** 合并两份 JSON 文本；解析失败时 error 指明是哪一侧。 */
export const mergeJson = (left: string, right: string, options: MergeOptions = {}): TransformResult => {
  const { arrayStrategy = 'replace', prefer = 'right' } = options
  const l = tryParseJson(left)
  if (l.error) return { result: '', error: `左侧 JSON 无效：${l.error}` }
  const r = tryParseJson(right)
  if (r.error) return { result: '', error: `右侧 JSON 无效：${r.error}` }

  const winner = <T,>(a: T, b: T): T => (prefer === 'left' ? a : b)

  const walk = (a: unknown, b: unknown): unknown => {
    if (isPlainObject(a) && isPlainObject(b)) {
      const out: Record<string, unknown> = { ...a }
      for (const [k, v] of Object.entries(b)) {
        out[k] = k in a ? walk(a[k], v) : v
      }
      return out
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (arrayStrategy === 'concat') return [...a, ...b]
      if (arrayStrategy === 'union') return dedupeArray([...a, ...b])
      return winner(a, b)
    }
    return winner(a, b)
  }

  return { result: JSON.stringify(walk(l.parsed, r.parsed), null, 2), error: null }
}
