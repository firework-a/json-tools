// 基础 JSON 工具
const wrapAsJsonString = (input: string): string => {
  let out = '"'
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === '\\' && i + 1 < input.length) {
      out += ch + input[i + 1]
      i++
    } else if (ch === '"') {
      out += '\\"'
    } else if (ch === '\n') {
      out += '\\n'
    } else if (ch === '\r') {
      out += '\\r'
    } else if (ch === '\t') {
      out += '\\t'
    } else {
      out += ch
    }
  }
  out += '"'
  return out
}

/**
 * 宽松 JSON 解析，自动兼容三种输入：
 * 1. 普通 JSON：{"a":1}
 * 2. 完整 JSON 字符串："{\"a\":1}" 或 "{\"a\":1}"
 * 3. 转义后无外层引号：{\"a\":1} 或 {\"a\":\"b\\nc\"}
 */
const tryParseJson = (input: string): { parsed: unknown; error: string | null } => {
  const trimmed = input.trim()
  if (!trimmed) return { parsed: '', error: null }

  const decodeRecursive = (val: unknown): unknown => {
    if (typeof val !== 'string' || !val.trim()) return val
    try { return decodeRecursive(JSON.parse(val)) } catch { return val }
  }

  try {
    return { parsed: decodeRecursive(JSON.parse(trimmed)), error: null }
  } catch {}
  try {
    return { parsed: decodeRecursive(JSON.parse(wrapAsJsonString(trimmed))), error: null }
  } catch {}
  return { parsed: null, error: 'JSON 解析错误' }
}

export const formatJson = (input: string, indent = 2): { result: string; error: string | null } => {
  const { parsed, error } = tryParseJson(input)
  if (error) return { result: '', error }
  return { result: JSON.stringify(parsed, null, indent), error: null }
}

export const compressJson = (input: string): { result: string; error: string | null } => {
  const { parsed, error } = tryParseJson(input)
  if (error) return { result: '', error }
  return { result: JSON.stringify(parsed), error: null }
}

export const escapeJson = (input: string): { result: string; error: string | null } => {
  const { parsed, error } = tryParseJson(input)
  if (error) return { result: '', error }
  return { result: JSON.stringify(JSON.stringify(parsed)).slice(1, -1), error: null }
}

export const unescapeJson = (input: string): { result: string; error: string | null } => {
  try {
    const trimmed = input.trim()
    if (!trimmed) return { result: '', error: null }

    let escapedText: string | null = null

    // 尝试1: 完整的 JSON 字符串，如 "{\"name\":\"张三\"}"
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'string') escapedText = parsed
    } catch { /* continue */ }

    // 尝试2: 缺少外层引号的转义内容，如 {\"name\":\"张三\"}（escapeJson 的输出）
    if (escapedText == null) {
      try {
        escapedText = JSON.parse(wrapAsJsonString(trimmed)) as string
      } catch { /* continue */ }
    }

    if (escapedText == null) {
      throw new Error('请输入转义后的 JSON 字符串')
    }

    // 尝试把解码后的文本解析为 JSON
    try {
      const innerJson = JSON.parse(escapedText)
      return { result: JSON.stringify(innerJson, null, 2), error: null }
    } catch {
      // 解码成功但不是合法 JSON，直接返回解码文本
      return { result: escapedText, error: null }
    }
  } catch (err) {
    return { result: '', error: err instanceof Error ? err.message : '处理错误' }
  }
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (text) {
      await navigator.clipboard.writeText(text)
      return true
    }
    return false
  } catch {
    return false
  }
}

export interface JsonStats {
  keyCount: number
  depth: number
  size: number // bytes
  lineCount: number
  valid: boolean
}

const byteLength = (s: string) => new Blob([s]).size

export const getJsonStats = (text: string): JsonStats => {
  const trimmed = text.trim()
  if (!trimmed) return { keyCount: 0, depth: 0, size: 0, lineCount: 0, valid: true }
  let parsed: any
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return {
      keyCount: 0,
      depth: 0,
      size: byteLength(text),
      lineCount: text.split('\n').length,
      valid: false,
    }
  }

  let keyCount = 0
  let maxDepth = 0
  const walk = (node: any, d: number) => {
    if (d > maxDepth) maxDepth = d
    if (Array.isArray(node)) {
      node.forEach((v) => walk(v, d + 1))
    } else if (node && typeof node === 'object') {
      const keys = Object.keys(node)
      keyCount += keys.length
      keys.forEach((k) => walk(node[k], d + 1))
    }
  }
  walk(parsed, Array.isArray(parsed) || (parsed && typeof parsed === 'object') ? 1 : 0)

  const formatted = JSON.stringify(parsed, null, 2)
  return {
    keyCount,
    depth: maxDepth,
    size: byteLength(trimmed),
    lineCount: formatted.split('\n').length,
    valid: true,
  }
}
