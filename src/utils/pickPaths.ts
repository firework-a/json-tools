// 按路径剔除 / 保留字段：与 paths.ts 使用同一套路径记法（数组折叠为 [*]）
// 典型用法：删掉所有 __typename、只保留接口里的几个字段再贴给别人
import { tryParseJson } from './json'

export type PickMode = 'omit' | 'keep'

export interface PickResult {
  result: string
  error: string | null
  /** 命中的路径数量（omit = 删除数，keep = 保留数） */
  hits: number
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

const DROP = Symbol('drop')
type Walked = unknown | typeof DROP

/** 模式转正则：`[*]` 匹配任意数组下标，`*` 匹配任意单层键名，其余按字面量转义。 */
export const patternToRegex = (pattern: string): RegExp => {
  let source = '^'
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '*') {
      if (pattern.startsWith('[*]', i)) {
        source += '\\[\\d+\\]'
        i += 2
        continue
      }
      source += '[^.[\\]]+'
      continue
    }
    source += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`${source}$`)
}

/** 末段键名（去掉数组下标），支撑「简写模式匹配任意层级同名键」的便捷语义。 */
const lastSegment = (path: string) => (path.split('.').pop() ?? '').replace(/\[\*\]+$/, '')

const parsePatterns = (patterns: string) =>
  patterns.split(/[\n,]/).map(p => p.trim()).filter(Boolean)

const buildMatcher = (patterns: string[]) => {
  const exact = patterns.map(patternToRegex)
  const shorthand = patterns.filter(p => !p.includes('.') && !p.includes('['))
  return (path: string) =>
    exact.some(re => re.test(path)) || (shorthand.length > 0 && shorthand.includes(lastSegment(path)))
}

/**
 * 按路径剔除（omit）或只保留（keep）字段。
 * 多个模式用换行或逗号分隔；不含点号与方括号的简写（如 `__typename`）匹配任意层级的同名键。
 */
export const filterPaths = (input: string, patterns: string, mode: PickMode = 'omit'): PickResult => {
  const { parsed, error } = tryParseJson(input)
  if (error) return { result: '', error, hits: 0 }
  const list = parsePatterns(patterns)
  if (!list.length) return { result: '', error: '请先填写要剔除/保留的字段路径', hits: 0 }
  if (!isPlainObject(parsed) && !Array.isArray(parsed)) {
    return { result: '', error: '字段剔除要求根节点是对象或数组', hits: 0 }
  }

  const matches = buildMatcher(list)
  let hits = 0

  const walkOmit = (value: unknown, path: string): Walked => {
    if (path && matches(path)) {
      hits += 1
      return DROP
    }
    if (Array.isArray(value)) return value.map(v => walkOmit(v, `${path}[*]`)).filter(v => v !== DROP)
    if (isPlainObject(value)) {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        const next = walkOmit(v, path ? `${path}.${k}` : k)
        if (next !== DROP) out[k] = next
      }
      return out
    }
    return value
  }

  const walkKeep = (value: unknown, path: string): Walked => {
    if (path && matches(path)) {
      hits += 1
      return value
    }
    if (Array.isArray(value)) {
      const kept = value.map(v => walkKeep(v, `${path}[*]`)).filter(v => v !== DROP)
      return kept.length ? kept : DROP
    }
    if (isPlainObject(value)) {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        const next = walkKeep(v, path ? `${path}.${k}` : k)
        if (next !== DROP) out[k] = next
      }
      return Object.keys(out).length ? out : DROP
    }
    return DROP
  }

  const walked = mode === 'keep' ? walkKeep(parsed, '') : walkOmit(parsed, '')
  const result = walked === DROP ? (Array.isArray(parsed) ? [] : {}) : walked
  return { result: JSON.stringify(result, null, 2), error: null, hits }
}
