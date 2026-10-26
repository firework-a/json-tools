// 时间戳双向处理：递归把 epoch 数字/数字串转成可读日期，或把日期字符串转回 epoch
import { tryParseJson } from './json'

export type TimestampUnit = 'auto' | 's' | 'ms'
export type TimestampFormat = 'iso' | 'local'

export interface TimestampHit {
  path: string
  from: string
  to: string
}

export interface TimestampResult {
  result: string
  error: string | null
  hits: TimestampHit[]
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

// 合理区间：秒 1973-01..2096-11，毫秒对应同一跨度
const SECONDS_RANGE: [number, number] = [1e8, 4e9]
const MILLIS_RANGE: [number, number] = [1e11, 4e12]

const pad = (n: number) => String(n).padStart(2, '0')

const formatLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

const detectUnit = (n: number): TimestampUnit | null => {
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null
  if (n >= SECONDS_RANGE[0] && n <= SECONDS_RANGE[1]) return 's'
  if (n >= MILLIS_RANGE[0] && n <= MILLIS_RANGE[1]) return 'ms'
  return null
}

const toEpochMs = (n: number, unit: TimestampUnit): number | null => {
  const detected = unit === 'auto' ? detectUnit(n) : unit
  if (!detected) return null
  return detected === 's' ? n * 1000 : n
}

/** epoch → 可读日期（默认 ISO，可选本地格式） */
export const humanizeTimestamps = (
  input: string,
  options: { unit?: TimestampUnit; format?: TimestampFormat } = {},
): TimestampResult => {
  const { unit = 'auto', format = 'iso' } = options
  const { parsed, error } = tryParseJson(input)
  if (error) return { result: '', error, hits: [] }
  if (!isPlainObject(parsed) && !Array.isArray(parsed)) {
    return { result: '', error: '时间戳转换要求根节点是对象或数组', hits: [] }
  }

  const hits: TimestampHit[] = []
  const walk = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) return value.map((v, i) => walk(v, `${path}[${i}]`))
    if (isPlainObject(value)) {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) out[k] = walk(v, path ? `${path}.${k}` : k)
      return out
    }
    const numeric = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : null
    if (numeric === null) return value
    const ms = toEpochMs(numeric, unit)
    if (ms === null) return value
    const date = new Date(ms)
    const text = format === 'local' ? formatLocal(date) : date.toISOString()
    hits.push({ path: path || '(根)', from: String(value), to: text })
    return text
  }

  return { result: JSON.stringify(walk(parsed, ''), null, 2), error: null, hits }
}

const DATE_STRING = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/

/** 可读日期字符串 → epoch（默认毫秒，unit=s 输出秒） */
export const toEpochTimestamps = (input: string, options: { unit?: 's' | 'ms' } = {}): TimestampResult => {
  const { unit = 'ms' } = options
  const { parsed, error } = tryParseJson(input)
  if (error) return { result: '', error, hits: [] }
  if (!isPlainObject(parsed) && !Array.isArray(parsed)) {
    return { result: '', error: '时间戳转换要求根节点是对象或数组', hits: [] }
  }

  const hits: TimestampHit[] = []
  const walk = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) return value.map((v, i) => walk(v, `${path}[${i}]`))
    if (isPlainObject(value)) {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) out[k] = walk(v, path ? `${path}.${k}` : k)
      return out
    }
    if (typeof value !== 'string' || !DATE_STRING.test(value.trim())) return value
    // 无时区后缀时按本地时间解析，避免被当成 UTC 偏移
    const normalized = value.trim().replace(' ', 'T')
    const ms = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized)
      ? Date.parse(normalized)
      : new Date(normalized).getTime()
    if (!Number.isFinite(ms)) return value
    const out = unit === 's' ? Math.round(ms / 1000) : ms
    hits.push({ path: path || '(根)', from: value, to: String(out) })
    return out
  }

  return { result: JSON.stringify(walk(parsed, ''), null, 2), error: null, hits }
}
