// JSON 结构变换：键排序 / 扁平化 / 还原 / 去空值
import { tryParseJson } from './json'

export interface TransformResult { result: string; error: string | null }

const ok = (data: unknown): TransformResult => ({ result: JSON.stringify(data, null, 2), error: null })
const err = (message: string): TransformResult => ({ result: '', error: message })

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

/** 递归排序对象键（数组保持原顺序） */
export const sortJsonKeys = (input: string, order: 'asc' | 'desc' = 'asc'): TransformResult => {
  const { parsed, error } = tryParseJson(input)
  if (error) return err(error)
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk)
    if (isPlainObject(value)) {
      const entries = Object.entries(value)
      entries.sort((a, b) => (order === 'asc' ? 1 : -1) * a[0].localeCompare(b[0]))
      return Object.fromEntries(entries.map(([k, v]) => [k, walk(v)]))
    }
    return value
  }
  return ok(walk(parsed))
}

/** 扁平化：{a:{b:[1]}} → {"a.b[0]":1} */
export const flattenJson = (input: string, sep = '.'): TransformResult => {
  const { parsed, error } = tryParseJson(input)
  if (error) return err(error)
  const out: Record<string, unknown> = {}
  const walk = (value: unknown, prefix: string) => {
    if (Array.isArray(value)) {
      if (!value.length) out[prefix] = []
      value.forEach((v, idx) => walk(v, `${prefix}[${idx}]`))
    } else if (isPlainObject(value)) {
      const keys = Object.keys(value)
      if (!keys.length) out[prefix] = {}
      keys.forEach(k => walk(value[k], prefix ? `${prefix}${sep}${k}` : k))
    } else {
      out[prefix] = value
    }
  }
  if (isPlainObject(parsed) || Array.isArray(parsed)) walk(parsed, '')
  else return err('扁平化要求根节点是对象或数组')
  return ok(out)
}

/** 把 "a.b[0].c" 形式的路径拆成 token 序列 */
const tokenizePath = (path: string, sep = '.'): (string | number)[] => {
  const tokens: (string | number)[] = []
  for (const seg of path.split(sep)) {
    const m = seg.match(/^([^[\]]+)((?:\[\d+\])*)$/)
    if (!m) { tokens.push(seg); continue }
    tokens.push(m[1])
    for (const idx of m[2].matchAll(/\[(\d+)\]/g)) tokens.push(Number(idx[1]))
  }
  return tokens
}

/** 还原扁平结构：{"a.b[0]":1} → {a:{b:[1]}} */
export const unflattenJson = (input: string, sep = '.'): TransformResult => {
  const { parsed, error } = tryParseJson(input)
  if (error) return err(error)
  if (!isPlainObject(parsed)) return err('还原要求输入是扁平化的 JSON 对象')
  const root: Record<string, unknown> = {}
  for (const [path, value] of Object.entries(parsed)) {
    const tokens = tokenizePath(path, sep)
    if (!tokens.length) continue
    // 内部按路径逐层构建，键可能是 string 或 number（数组下标），用 any 简化索引
    let cur: any = root
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      const last = i === tokens.length - 1
      if (last) { cur[t] = value; break }
      const nextIsIndex = typeof tokens[i + 1] === 'number'
      if (cur[t] === undefined || cur[t] === null || typeof cur[t] !== 'object') {
        cur[t] = nextIsIndex ? [] : {}
      }
      cur = cur[t]
    }
  }
  return ok(root)
}

/** 移除 null / undefined / 空字符串 / 空数组 / 空对象；keepEmpty=false 时移除全部空值 */
export const removeEmptyValues = (input: string, onlyNull = true): TransformResult => {
  const { parsed, error } = tryParseJson(input)
  if (error) return err(error)
  const isEmpty = (v: unknown): boolean => {
    if (v === null || v === undefined || v === '') return true
    if (!onlyNull) {
      if (Array.isArray(v)) return v.length === 0
      if (isPlainObject(v)) return Object.keys(v).length === 0
    }
    return false
  }
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk).filter(v => !isEmpty(v))
    if (isPlainObject(value)) {
      const kept: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        const w = walk(v)
        if (!isEmpty(w)) kept[k] = w
      }
      return kept
    }
    return value
  }
  if (parsed === null || parsed === undefined || typeof parsed !== 'object') return err('去空值要求根节点是对象或数组')
  return ok(walk(parsed))
}
