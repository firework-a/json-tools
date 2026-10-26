// 表格导出：对象数组 → Markdown / HTML 表格（数据源与 MCP 的 json_table_extract 共用 buildTable）
import { tryParseJson } from './json'
import { buildTable } from './table'
import type { TransformResult } from './jsonTransform'

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

const escapeMarkdown = (text: string) => text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const tableToMarkdown = (columns: string[], rows: Record<string, unknown>[]): string => {
  const head = `| ${columns.map(c => escapeMarkdown(cell(c))).join(' | ')} |`
  const sep = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map(r => `| ${columns.map(c => escapeMarkdown(cell(r[c]))).join(' | ')} |`)
  return [head, sep, ...body].join('\n')
}

export const tableToHtml = (columns: string[], rows: Record<string, unknown>[], title = ''): string => {
  const caption = title ? `  <caption>${escapeHtml(title)}</caption>\n` : ''
  const head = `    <thead><tr>${columns.map(c => `<th>${escapeHtml(cell(c))}</th>`).join('')}</tr></thead>`
  const body = rows
    .map(r => `      <tr>${columns.map(c => `<td>${escapeHtml(cell(r[c]))}</td>`).join('')}</tr>`)
    .join('\n')
  return `<table>\n${caption}${head}\n    <tbody>\n${body}\n    </tbody>\n</table>`
}

/** 从 JSON 文本提取对象数组并导出为 Markdown / HTML 表格 */
export type TableExportFormat = 'markdown' | 'html'

export const exportTable = (input: string, format: TableExportFormat): TransformResult => {
  const { parsed, error } = tryParseJson(input)
  if (error) return { result: '', error }
  if (!isPlainObject(parsed) && !Array.isArray(parsed)) return { result: '', error: '输入不是 JSON 对象或数组' }
  const table = buildTable(parsed)
  if (!table) return { result: '', error: '未找到对象数组（需要根数组或根下的对象数组字段）' }
  const result = format === 'html'
    ? tableToHtml(table.columns, table.rows, table.title)
    : tableToMarkdown(table.columns, table.rows)
  return { result, error: null }
}
