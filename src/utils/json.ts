// 基础 JSON 工具
export const formatJson = (input: string, indent = 2): { result: string; error: string | null } => {
  try {
    if (!input.trim()) return { result: '', error: null }
    const parsed = JSON.parse(input)
    return { result: JSON.stringify(parsed, null, indent), error: null }
  } catch (err) {
    return { result: '', error: err instanceof Error ? err.message : 'JSON 解析错误' }
  }
}

export const compressJson = (input: string): { result: string; error: string | null } => {
  try {
    if (!input.trim()) return { result: '', error: null }
    const parsed = JSON.parse(input)
    return { result: JSON.stringify(parsed), error: null }
  } catch (err) {
    return { result: '', error: err instanceof Error ? err.message : 'JSON 解析错误' }
  }
}

export const escapeJson = (input: string): { result: string; error: string | null } => {
  try {
    const parsed = JSON.parse(input)
    return { result: JSON.stringify(JSON.stringify(parsed)).slice(1, -1), error: null }
  } catch (err) {
    return { result: '', error: err instanceof Error ? err.message : '处理错误' }
  }
}

export const unescapeJson = (input: string): { result: string; error: string | null } => {
  try {
    const unescaped = JSON.parse('"' + input.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"')
    const parsed = JSON.parse(unescaped)
    return { result: JSON.stringify(parsed, null, 2), error: null }
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
