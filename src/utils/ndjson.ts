// NDJSON（newline-delimited JSON）与 JSON 数组互转

export const convertNdjson = (input: string, toJson: boolean): { result: string; error: string | null } => {
  const trimmed = input.trim()
  if (!trimmed) return { result: '', error: null }

  if (toJson) {
    // NDJSON → JSON 数组：逐行解析，跳过空行与注释行
    const lines = trimmed.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('//'))
    if (lines.length === 0) return { result: '', error: null }
    const items: unknown[] = []
    const bad: number[] = []
    lines.forEach((line, i) => {
      try {
        items.push(JSON.parse(line))
      } catch {
        bad.push(i + 1)
      }
    })
    if (bad.length > 0) {
      return { result: '', error: `第 ${bad.slice(0, 5).join('、')} 行不是合法 JSON${bad.length > 5 ? `（共 ${bad.length} 行失败）` : ''}` }
    }
    return { result: JSON.stringify(items, null, 2), error: null }
  }

  // JSON → NDJSON：数组逐条输出，单对象单行
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (e) {
    return { result: '', error: 'JSON 解析错误：' + (e instanceof Error ? e.message : String(e)) }
  }
  const items = Array.isArray(parsed) ? parsed : [parsed]
  const lines = items.map(item => JSON.stringify(item))
  return { result: lines.join('\n'), error: null }
}
