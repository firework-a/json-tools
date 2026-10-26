// 键名风格批量转换：递归把对象键在 camelCase / snake_case / kebab-case / PascalCase 间互转
import { tryParseJson } from './json'
import type { TransformResult } from './jsonTransform'

export type KeyCase = 'camel' | 'snake' | 'kebab' | 'pascal'

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

const capitalize = (word: string) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word)

/** 拆词：XMLHttpRequest → [XML, Http, Request]，user_id → [user, id]，user-name → [user, name] */
export const splitWords = (key: string): string[] =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .filter(Boolean)

export const toKeyCase = (key: string, style: KeyCase): string => {
  const words = splitWords(key)
  if (!words.length) return key
  switch (style) {
    case 'camel':
      return words[0].toLowerCase() + words.slice(1).map(capitalize).join('')
    case 'pascal':
      return words.map(capitalize).join('')
    case 'snake':
      return words.map(w => w.toLowerCase()).join('_')
    case 'kebab':
      return words.map(w => w.toLowerCase()).join('-')
  }
}

/**
 * 递归转换所有对象键名。
 * 若两个键转换后撞名（如同时存在 a_b 与 aB）会丢数据，直接报错并给出路径。
 */
export const convertKeys = (input: string, style: KeyCase): TransformResult => {
  const { parsed, error } = tryParseJson(input)
  if (error) return { result: '', error }
  if (!isPlainObject(parsed) && !Array.isArray(parsed)) {
    return { result: '', error: '键名转换要求根节点是对象或数组' }
  }

  const collisions: string[] = []
  const walk = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) return value.map((v, i) => walk(v, `${path}[${i}]`))
    if (!isPlainObject(value)) return value
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      const next = toKeyCase(k, style)
      const childPath = path ? `${path}.${k}` : k
      if (Object.prototype.hasOwnProperty.call(out, next)) {
        collisions.push(`${childPath} → ${next}`)
        continue
      }
      out[next] = walk(v, childPath)
    }
    return out
  }
  const converted = walk(parsed, '')
  if (collisions.length) {
    return { result: '', error: `键名转换后发生冲突（会丢数据）：${collisions.slice(0, 5).join('、')}${collisions.length > 5 ? ` 等 ${collisions.length} 处` : ''}` }
  }
  return { result: JSON.stringify(converted, null, 2), error: null }
}
