// 数组按字段排序：定位 JSON 里的对象数组并按指定字段（支持点号路径）稳定排序，保持外层文档结构
import { tryParseJson } from './json'
import type { TransformResult } from './jsonTransform'

export type SortDirection = 'asc' | 'desc'
export type MissingPlacement = 'last' | 'first'

export interface SortByFieldOptions {
  order?: SortDirection
  /** 缺失字段 / null 值的摆放位置，默认排在末尾（两种方向都保持在末尾，同 SQL NULLS LAST） */
  missing?: MissingPlacement
}

const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
const ISO_LIKE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}|Z)/

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

/** 点号路径取值：`user.name` / `tags.0`；数组下标越界返回 undefined */
const readPath = (value: unknown, segments: string[]): unknown =>
  segments.reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined
    if (Array.isArray(acc)) return acc[Number(key)]
    if (typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, value)

/** 类型秩：跨类型比较时按 数值 < 字符串 < 布尔 < 对象/数组 排序，避免抖动 */
const rank = (v: unknown): number => {
  if (typeof v === 'number') return 0
  if (typeof v === 'string') return 1
  if (typeof v === 'boolean') return 2
  return 3
}

const compareValues = (a: unknown, b: unknown): number => {
  const [ra, rb] = [rank(a), rank(b)]
  if (ra !== rb) return ra - rb
  if (ra === 0) return (a as number) - (b as number)
  if (ra === 2) return Number(a) - Number(b)
  if (ra === 3) return COLLATOR.compare(JSON.stringify(a), JSON.stringify(b))
  const [sa, sb] = [a as string, b as string]
  if (ISO_LIKE.test(sa) && ISO_LIKE.test(sb)) {
    const [ta, tb] = [Date.parse(sa), Date.parse(sb)]
    if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb
  }
  return COLLATOR.compare(sa, sb)
}

/** 找到要排序的数组：根数组优先，否则取第一个「对象数组」字段（保持外层信封不变） */
const locateArray = (parsed: unknown): Record<string, unknown>[] | null => {
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[]
  if (!isPlainObject(parsed)) return null
  for (const value of Object.values(parsed)) {
    if (Array.isArray(value) && value.length && value.every(isPlainObject)) {
      return value as Record<string, unknown>[]
    }
  }
  return null
}

/**
 * 按字段排序对象数组。field 留空则直接排序数组元素本身（适用于 `[3,1,2]` 这类标量数组）。
 * 返回命中条数用于界面提示「共 N 条已排序」。
 */
export const sortByField = (
  input: string,
  field: string,
  options: SortByFieldOptions = {},
): TransformResult & { hits?: number } => {
  const { parsed, error } = tryParseJson(input)
  if (error) return { result: '', error }
  const order = options.order ?? 'asc'
  const missing = options.missing ?? 'last'
  const sign = order === 'desc' ? -1 : 1

  if (Array.isArray(parsed) && !field.trim()) {
    if (parsed.some(isPlainObject)) return { result: '', error: '请填写排序字段（支持点号路径，如 user.name）' }
    const sorted = [...parsed].sort((a, b) => {
      const [an, bn] = [a === null || a === undefined, b === null || b === undefined]
      if (an && bn) return 0
      if (an) return missing === 'last' ? 1 : -1
      if (bn) return missing === 'last' ? -1 : 1
      return compareValues(a, b) * sign
    })
    return { result: JSON.stringify(sorted, null, 2), error: null, hits: sorted.length }
  }

  const rows = locateArray(parsed)
  if (!rows) return { result: '', error: '未找到对象数组（根数组或对象下的数组字段）' }
  if (!rows.length) return { result: '', error: '数组为空' }

  const segments = field.trim() ? field.trim().split('.') : []
  if (!segments.length) return { result: '', error: '请填写排序字段（支持点号路径，如 user.name）' }
  if (!rows.some(row => readPath(row, segments) !== undefined)) {
    const siblings = Object.keys(rows[0]).join(', ') || '（首条无字段）'
    return { result: '', error: `没有元素含字段「${field.trim()}」，首条字段：${siblings}` }
  }

  const indexed = rows.map((row, i) => ({ row, i, key: readPath(row, segments) }))
  indexed.sort((a, b) => {
    const [am, bm] = [a.key === null || a.key === undefined, b.key === null || b.key === undefined]
    if (am && bm) return a.i - b.i
    if (am) return missing === 'last' ? 1 : -1
    if (bm) return missing === 'last' ? -1 : 1
    const cmp = compareValues(a.key, b.key)
    return cmp !== 0 ? cmp * sign : a.i - b.i
  })

  const sorted = indexed.map(x => x.row)
  if (Array.isArray(parsed)) return { result: JSON.stringify(sorted, null, 2), error: null, hits: sorted.length }
  const target = Object.keys(parsed as Record<string, unknown>).find(
    key => (parsed as Record<string, unknown>)[key] === rows,
  )!
  return {
    result: JSON.stringify({ ...(parsed as Record<string, unknown>), [target]: sorted }, null, 2),
    error: null,
    hits: sorted.length,
  }
}
