// 字段路径统计：递归汇总每个路径的出现次数、父级覆盖率、类型分布、null 数与示例值
// 用于分析 API 响应结构（哪些字段可选、哪些类型混杂、null 率多高）
import { tryParseJson } from './json'

export interface PathStat {
  path: string
  count: number
  coverage: number
  types: Record<string, number>
  nulls: number
  sample: string
}

export interface PathReport {
  result: string
  error: string | null
  stats: PathStat[]
}

const MAX_PATHS = 400
const MAX_DEPTH = 12

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

const typeOf = (v: unknown): string =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v

const sampleOf = (v: unknown): string => {
  if (typeof v === 'string') return v.length > 24 ? `${v.slice(0, 24)}…` : v
  if (v === null || typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `array[${v.length}]`
  return `object{${Object.keys(v as object).length}}`
}

const formatTypes = (types: Record<string, number>) =>
  Object.entries(types)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t}×${n}`)
    .join(' / ')

const parentOf = (path: string): string => {
  if (path === '(根)') return '(根)'
  const stripped = path.replace(/(\.[^.[\s]+|\[\*\])$/, '')
  return stripped || '(根)'
}

/** 收集所有字段路径的统计信息（数组统一折叠为 `[*]`，避免下标爆炸）。 */
export const collectPaths = (input: string): PathReport => {
  const { parsed, error } = tryParseJson(input)
  if (error) return { result: '', error, stats: [] }

  const map = new Map<string, PathStat>()
  const record = (key: string, value: unknown) => {
    let stat = map.get(key)
    if (!stat) {
      if (map.size >= MAX_PATHS) return
      stat = { path: key, count: 0, coverage: 1, types: {}, nulls: 0, sample: sampleOf(value) }
      map.set(key, stat)
    }
    stat.count += 1
    const t = typeOf(value)
    stat.types[t] = (stat.types[t] ?? 0) + 1
    if (t === 'null') stat.nulls += 1
  }

  const walk = (value: unknown, path: string, depth: number) => {
    record(path || '(根)', value)
    if (depth >= MAX_DEPTH) return
    if (Array.isArray(value)) {
      for (const item of value) walk(item, `${path}[*]`, depth + 1)
    } else if (isPlainObject(value)) {
      for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k, depth + 1)
    }
  }
  walk(parsed, '', 0)

  const stats = [...map.values()]
  for (const stat of stats) {
    const parent = map.get(parentOf(stat.path))
    stat.coverage = parent && parent.count > 0 ? Math.min(1, stat.count / parent.count) : 1
  }
  stats.sort((a, b) => a.path.localeCompare(b.path))
  return { result: formatPathReport(stats), error: null, stats }
}

/** 生成 Markdown 报告（工具箱输出与 MCP 文本共用）。 */
export const formatPathReport = (stats: PathStat[]): string => {
  const lines = [
    `| 路径 | 次数 | 覆盖率 | 类型分布 | null | 示例 |`,
    `| --- | --- | --- | --- | --- | --- |`,
  ]
  for (const s of stats) {
    const cells = [
      s.path,
      String(s.count),
      `${Math.round(s.coverage * 100)}%`,
      formatTypes(s.types),
      s.nulls ? String(s.nulls) : '—',
      s.sample || '—',
    ]
    lines.push(`| ${cells.map(c => c.replace(/\|/g, '\\|')).join(' | ')} |`)
  }
  return [`共 ${stats.length} 个字段路径`, '', ...lines].join('\n')
}
