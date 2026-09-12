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

const isWs = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r'

// 非标准字面量 → 合法 JSON 字面量（仅出现在“值”位置时替换）
const LITERAL_MAP: Record<string, string> = {
  True: 'true', False: 'false', None: 'null',
  undefined: 'null', NaN: 'null', Infinity: 'null',
}

/**
 * 宽松修复非标准 JSON（best-effort），单遍状态机扫描，字符串内容不受影响：
 * 1. 去 BOM、智能引号（“ ” ‘ ’）→ 直引号
 * 2. 删除 // 行注释与 /* *\/ 块注释
 * 3. 单引号字符串 → 双引号（内部双引号自动转义）
 * 4. 无引号键 → 补双引号；伪字面量（True/None/undefined…）→ 合法字面量
 * 5. 删除 } ] 前的尾逗号
 */
export const repairJson = (input: string): string => {
  let src = input.replace(/^\uFEFF/, '')
  src = src.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'")
  const n = src.length
  const out: string[] = []
  let i = 0
  while (i < n) {
    const ch = src[i]
    // 注释
    if (ch === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) {
      if (src[i + 1] === '/') {
        i += 2
        while (i < n && src[i] !== '\n') i++
      } else {
        i += 2
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++
        i += 2
      }
      continue
    }
    // 双引号字符串：原样搬运（含转义）
    if (ch === '"') {
      out.push('"'); i++
      while (i < n) {
        const c = src[i]
        if (c === '\\') {
          out.push(c)
          if (i + 1 < n) { out.push(src[i + 1]); i += 2 } else i++
          continue
        }
        out.push(c); i++
        if (c === '"') break
      }
      continue
    }
    // 单引号字符串：转双引号，内部双引号转义
    if (ch === "'") {
      out.push('"'); i++
      while (i < n) {
        const c = src[i]
        if (c === '\\') {
          const next = src[i + 1]
          if (next === "'") { out.push("'"); i += 2; continue } // \' → '
          out.push(c)
          if (i + 1 < n) { out.push(next); i += 2 } else i++
          continue
        }
        if (c === "'") { out.push('"'); i++; break }
        if (c === '"') { out.push('\\"'); i++; continue }
        if (c === '\n') { out.push('\\n'); i++; continue } // 单引号串内换行转义，避免破坏结构
        out.push(c); i++
      }
      continue
    }
    // 裸词：键（后跟 :）补引号；值位置做伪字面量映射
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i
      while (j < n && /[A-Za-z0-9_$-]/.test(src[j])) j++
      const word = src.slice(i, j)
      let k = j
      while (k < n && isWs(src[k])) k++
      if (src[k] === ':') {
        out.push(`"${word}"`)
      } else {
        out.push(LITERAL_MAP[word] ?? word)
      }
      i = j
      continue
    }
    // 尾逗号：, 后第一个“有效字符”（跳过空白与注释）是 } 或 ] 则丢弃
    if (ch === ',') {
      let k = i + 1
      while (k < n) {
        if (isWs(src[k])) { k++; continue }
        if (src[k] === '/' && src[k + 1] === '/') { k += 2; while (k < n && src[k] !== '\n') k++; continue }
        if (src[k] === '/' && src[k + 1] === '*') { k += 2; while (k < n && !(src[k] === '*' && src[k + 1] === '/')) k++; k += 2; continue }
        break
      }
      if (src[k] === '}' || src[k] === ']') { i++; continue }
      out.push(','); i++
      continue
    }
    out.push(ch); i++
  }
  return out.join('')
}

/**
 * 宽松 JSON 解析，自动兼容三种输入：
 * 1. 普通 JSON：{"a":1}
 * 2. 完整 JSON 字符串："{\"a\":1}" 或 "{\"a\":1}"
 * 3. 转义后无外层引号：{\"a\":1} 或 {\"a\":\"b\\nc\"}
 * 均失败时尝试 repairJson 修复非标准 JSON（注释/单引号/尾逗号/无引号键等）
 */
export const tryParseJson = (input: string): { parsed: unknown; error: string | null } => {
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
    const wrapped = decodeRecursive(JSON.parse(wrapAsJsonString(trimmed)))
    // 仅当确实发生反转义（结果与原文不同）才认定命中；
    // 否则说明这只是把整段非标准 JSON 当成巨型字符串，应继续尝试 repairJson
    if (typeof wrapped !== 'string' || wrapped !== trimmed) {
      return { parsed: wrapped, error: null }
    }
  } catch {}
  try {
    return { parsed: decodeRecursive(JSON.parse(repairJson(trimmed))), error: null }
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
  if (!text) return false
  // Tauri 环境优先走原生剪贴板插件：WebView2 里 navigator.clipboard
  // 在窗口无焦点/权限受限场景会假成功（resolve 但没真正写入）。
  try {
    const { isTauri } = await import('@tauri-apps/api/core')
    if (isTauri()) {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
      await writeText(text)
      return true
    }
  } catch {
    // 落到浏览器 API
  }
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 兜底：老 API + 临时 textarea
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
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

export type DetectedFormat = 'json' | 'xml' | 'yaml' | 'csv' | 'text'

/** 智能识别输入文本的格式（用于粘贴提示与工具箱） */
export const detectFormat = (input: string): DetectedFormat => {
  const t = input.trim()
  if (!t) return 'text'
  if (!tryParseJson(t).error) return 'json'
  if (/^<\?xml[\s\S]*>|^<[a-zA-Z_][\w:.-]*(\s|>|\/)/.test(t)) return 'xml'
  // 含逗号且行数一致，像 CSV
  const lines = t.split(/\r?\n/).filter(Boolean)
  if (lines.length > 1 && lines.every(l => l.includes(','))) return 'csv'
  // YAML：含 key: value 或 - 列表项且非 JSON
  if (/^(\s*-\s|\s*[\w"']+\s*:(\s|$))/m.test(t) && /:\s/.test(t)) return 'yaml'
  return 'text'
}
