// 敏感字段脱敏：按键名特征与值格式识别，递归打码并给出命中清单
import { tryParseJson } from './json'

export interface RedactHit {
  path: string
  rule: string
}

export interface RedactResult {
  result: string
  error: string | null
  hits: RedactHit[]
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

const KEY_SENSITIVE = /(pass(word|wd|wd)?|pwd|secret|token|api[-_]?key|apikey|access[-_]?key|private[-_]?key|client[-_]?secret|auth(orization)?|credential|cookie|session[-_]?id|signature|otp|cvv|ssn|id[-_]?card)/i

interface ValueRule {
  rule: string
  test: (value: string) => boolean
}

const VALUE_RULES: ValueRule[] = [
  { rule: 'JWT', test: v => /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+$/.test(v) },
  { rule: '身份证号', test: v => /^\d{17}[\dXx]$/.test(v) },
  { rule: '手机号', test: v => /^1[3-9]\d{9}$/.test(v) },
  { rule: '银行卡号', test: v => /^\d{13,19}$/.test(v) },
  { rule: '邮箱', test: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) },
  { rule: 'IPv4', test: v => /^(\d{1,3}\.){3}\d{1,3}$/.test(v) && v.split('.').every(p => Number(p) <= 255) },
  { rule: '长随机串', test: v => v.length >= 20 && /^[A-Za-z0-9+/_=-]+$/.test(v) && /\d/.test(v) && /[A-Za-z]/.test(v) },
]

/** 保留首尾各 2 字符便于人工比对，短值整体打码。 */
const mask = (value: string, keepEdges: boolean) => {
  if (!keepEdges || value.length <= 6) return '*'.repeat(Math.max(value.length, 3))
  return `${value.slice(0, 2)}${'*'.repeat(Math.min(value.length - 4, 16))}${value.slice(-2)}`
}

const maskDeep = (value: unknown): unknown => {
  if (typeof value === 'string') return mask(value, false)
  if (typeof value === 'number' || typeof value === 'boolean') return '***'
  if (Array.isArray(value) || isPlainObject(value)) return '***'
  return value
}

/**
 * 递归脱敏。keepEdges=false 时整值替换为等长星号（默认保留首尾便于核对）。
 * extraKeyPattern 追加自定义键名正则（非法正则会被忽略而不是抛错）。
 */
export const redactJson = (
  input: string,
  options: { keepEdges?: boolean; extraKeyPattern?: string } = {},
): RedactResult => {
  const { keepEdges = true, extraKeyPattern } = options
  const { parsed, error } = tryParseJson(input)
  if (error) return { result: '', error, hits: [] }
  if (!isPlainObject(parsed) && !Array.isArray(parsed)) {
    return { result: '', error: '脱敏要求根节点是对象或数组', hits: [] }
  }

  let extraKey: RegExp | null = null
  if (extraKeyPattern) {
    try {
      extraKey = new RegExp(extraKeyPattern, 'i')
    } catch {
      extraKey = null
    }
  }

  const hits: RedactHit[] = []
  const walk = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) return value.map((v, i) => walk(v, `${path}[${i}]`))
    if (isPlainObject(value)) {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        const childPath = path ? `${path}.${k}` : k
        const byKey = KEY_SENSITIVE.test(k) || (!!extraKey && extraKey.test(k))
        if (byKey) {
          hits.push({ path: childPath, rule: '键名命中' })
          out[k] = maskDeep(v)
          continue
        }
        out[k] = walk(v, childPath)
      }
      return out
    }
    if (typeof value !== 'string') return value
    const hit = VALUE_RULES.find(r => r.test(value))
    if (!hit) return value
    hits.push({ path: path || '(根)', rule: hit.rule })
    return mask(value, keepEdges)
  }

  return { result: JSON.stringify(walk(parsed, ''), null, 2), error: null, hits }
}
