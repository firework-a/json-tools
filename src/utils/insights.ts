// 智能分析（本地规则引擎）：对 JSON 做结构摘要、字段类型统计、数据质量检查与优化建议。
// 离线、确定性，无 API key——为 AI 助手/用户提供"解释这份数据"的能力。

interface FieldStat {
  path: string
  types: string[]
  nullCount: number
  total: number
  samples: string[]
}

interface QualityIssue {
  level: 'warn' | 'info'
  message: string
}

export interface InsightsResult {
  summary: string
  fields: FieldStat[]
  issues: QualityIssue[]
  suggestions: string[]
}

const fmtVal = (v: unknown): string => {
  if (v === null) return 'null'
  if (typeof v === 'string') return v.length > 24 ? `"${v.slice(0, 24)}…"` : `"${v}"`
  if (typeof v === 'object') return Array.isArray(v) ? '[…]' : '{…}'
  return String(v)
}

const typeOf = (v: unknown): string => {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  if (typeof v === 'object') return 'object'
  return typeof v
}

export const analyzeJson = (input: string): { result: InsightsResult; error: string | null } => {
  const trimmed = input.trim()
  if (!trimmed) return { result: { summary: '', fields: [], issues: [], suggestions: [] }, error: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (e) {
    return { result: { summary: '', fields: [], issues: [], suggestions: [] }, error: 'JSON 解析错误：' + (e instanceof Error ? e.message : String(e)) }
  }

  const fields: FieldStat[] = []
  const issues: QualityIssue[] = []
  const suggestions: string[] = []
  let nodeCount = 0
  let maxDepth = 0
  let arrayCount = 0
  let objectCount = 0

  const walk = (v: unknown, path: string, depth: number) => {
    nodeCount++
    if (depth > maxDepth) maxDepth = depth
    if (Array.isArray(v)) {
      arrayCount++
      if (v.length === 0) issues.push({ level: 'info', message: `${path || '根'} 是空数组` })
      for (const item of v.slice(0, 200)) walk(item, `${path}[]`, depth + 1)
      return
    }
    if (v !== null && typeof v === 'object') {
      objectCount++
      const keys = Object.keys(v as Record<string, unknown>)
      if (keys.length === 0) issues.push({ level: 'info', message: `${path || '根'} 是空对象` })
      for (const [k, item] of Object.entries(v as Record<string, unknown>)) walk(item, path ? `${path}.${k}` : k, depth + 1)
      return
    }
    // 叶子值：聚合到字段统计
    let stat = fields.find(f => f.path === path)
    if (!stat) {
      stat = { path, types: [], nullCount: 0, total: 0, samples: [] }
      fields.push(stat)
    }
    const t = typeOf(v)
    if (!stat.types.includes(t)) stat.types.push(t)
    stat.total++
    if (v === null) stat.nullCount++
    if (stat.samples.length < 3) stat.samples.push(fmtVal(v))
  }
  walk(parsed, '', 1)

  // 数据质量检查
  for (const f of fields) {
    if (f.types.length > 1) {
      issues.push({ level: 'warn', message: `${f.path} 类型混杂（${f.types.join(' / ')}），可能影响 Schema 推断与下游解析` })
    }
    if (f.total >= 3 && f.nullCount / f.total > 0.3) {
      issues.push({ level: 'warn', message: `${f.path} 的 null 占比 ${(Math.round((f.nullCount / f.total) * 100))}%（${f.nullCount}/${f.total}），可考虑「去 null」或给默认值` })
    } else if (f.total >= 1 && f.nullCount === f.total) {
      issues.push({ level: 'warn', message: `${f.path} 的值全部为 null（${f.nullCount}/${f.total}），可考虑「去 null」或给默认值` })
    }
  }
  if (maxDepth >= 6) issues.push({ level: 'warn', message: `嵌套深度 ${maxDepth} 层，过深嵌套可考虑「扁平化」` })

  // 建议
  const root = parsed
  if (Array.isArray(root) && root.length > 0 && root.every(i => typeof i === 'object' && i !== null && !Array.isArray(i))) {
    suggestions.push('根是对象数组：可用「表格视图」浏览/编辑，或导出 Markdown / CSV')
  }
  if (detectFormatSafe(trimmed) === 'minified') suggestions.push('内容是单行压缩 JSON：可「美化」后再浏览')
  if (issues.some(i => i.message.includes('类型混杂'))) suggestions.push('存在类型混杂字段：生成 Schema 前建议先统一类型')
  if (issues.some(i => i.message.includes('null'))) suggestions.push('null 较多：工具箱「去空值」可一键清理')
  if (maxDepth >= 6) suggestions.push('嵌套过深：工具箱「扁平化」可把嵌套键拍平')
  if (suggestions.length === 0) suggestions.push('结构良好，未发现明显问题')

  const rootDesc = Array.isArray(root)
    ? `根数组，${root.length} 个元素`
    : typeof root === 'object' && root !== null
      ? `根对象，${Object.keys(root as object).length} 个顶层键`
      : `标量（${typeof root}）`

  const summary = `${rootDesc} · 共 ${nodeCount} 个节点 · 最大嵌套 ${maxDepth} 层 · ${arrayCount} 个数组 · ${objectCount} 个对象 · ${fields.length} 个叶子字段`

  return { result: { summary, fields, issues, suggestions }, error: null }
}

// 简单判断是否为单行压缩 JSON（用于建议）
const detectFormatSafe = (input: string): string => {
  const t = input.trim()
  if (/^[[{]/.test(t) && /[}\]]$/.test(t) && !t.includes('\n')) return 'minified'
  return 'ok'
}

/** 把分析结果格式化为人类可读的分析报告 */
export const formatInsightsReport = (r: InsightsResult): string => {
  const lines: string[] = []
  lines.push('📊 数据概览')
  lines.push(`  ${r.summary}`)
  if (r.fields.length > 0) {
    lines.push('')
    lines.push('🔤 字段统计')
    for (const f of r.fields.slice(0, 40)) {
      lines.push(`  ${f.path} — ${f.types.join(' / ')}${f.nullCount > 0 ? ` · null ${f.nullCount}/${f.total}` : ''} · 示例: ${f.samples.join(', ')}`)
    }
    if (r.fields.length > 40) lines.push(`  …（其余 ${r.fields.length - 40} 个字段省略）`)
  }
  if (r.issues.length > 0) {
    lines.push('')
    lines.push('⚠️ 数据质量')
    for (const i of r.issues.slice(0, 20)) {
      lines.push(`  ${i.level === 'warn' ? '⚠' : 'ℹ'} ${i.message}`)
    }
  }
  lines.push('')
  lines.push('💡 建议')
  for (const s of r.suggestions) lines.push(`  · ${s}`)
  return lines.join('\n')
}
