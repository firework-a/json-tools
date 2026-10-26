// SQL 导出：JSON 里的对象数组 → 建表 DDL + 批量 INSERT（数据源与表格导出共用 buildTable）
import { tryParseJson } from './json'
import { buildTable } from './table'
import type { TransformResult } from './jsonTransform'

export type SqlDialect = 'mysql' | 'postgres' | 'sqlite'

export interface SqlExportOptions {
  /** 表名，缺省时取数组所在字段名（根数组用 data_rows） */
  table?: string
  dialect?: SqlDialect
  /** 是否输出 CREATE TABLE，false 时只给 INSERT */
  includeCreate?: boolean
  /** 每条 INSERT 语句合并的行数 */
  batchSize?: number
}

/** 列的推断类型（null 只影响可空性，不参与类型判定） */
type ColType = 'bigint' | 'double' | 'boolean' | 'datetime' | 'text' | 'json'

interface ColumnSpec {
  name: string
  type: ColType
  /** 文本列观测到的最大长度，用于 VARCHAR(n) */
  maxLength: number
  nullable: boolean
  /** 是否真正用到（未用到的列不写 DDL，保持 CREATE TABLE 干净） */
  seen: boolean
}

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/

const classify = (value: unknown): ColType | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return Number.isInteger(value) ? 'bigint' : 'double'
  if (typeof value === 'string') return ISO_DATETIME.test(value) ? 'datetime' : 'text'
  return 'json'
}

/** 类型合并：宽化为更能容纳的一侧；跨语义（布尔/日期/数值 vs 文本）一律退回文本 */
const widen = (a: ColType, b: ColType): ColType => {
  if (a === b) return a
  if (a === 'json' || b === 'json') return 'json'
  if (a === 'text' || b === 'text') return 'text'
  if (a === 'datetime' || b === 'datetime') return 'text'
  if (a === 'boolean' || b === 'boolean') return 'text'
  if (a === 'double' || b === 'double') return 'double'
  return 'bigint'
}

const columnType = (col: ColumnSpec, dialect: SqlDialect): string => {
  if (dialect === 'mysql') {
    switch (col.type) {
      case 'bigint': return 'BIGINT'
      case 'double': return 'DOUBLE'
      case 'boolean': return 'TINYINT(1)'
      case 'datetime': return 'DATETIME'
      case 'json': return 'JSON'
      default: return col.maxLength > 0 && col.maxLength <= 255 ? `VARCHAR(${col.maxLength})` : 'TEXT'
    }
  }
  if (dialect === 'postgres') {
    switch (col.type) {
      case 'bigint': return 'BIGINT'
      case 'double': return 'DOUBLE PRECISION'
      case 'boolean': return 'BOOLEAN'
      case 'datetime': return 'TIMESTAMPTZ'
      case 'json': return 'JSONB'
      default: return col.maxLength > 0 && col.maxLength <= 255 ? `VARCHAR(${col.maxLength})` : 'TEXT'
    }
  }
  switch (col.type) {
    // SQLite 只有动态类型，按 affinity 给出最接近的声明
    case 'bigint': return 'INTEGER'
    case 'double': return 'REAL'
    case 'boolean': return 'INTEGER'
    case 'json': return 'TEXT'
    default: return 'TEXT'
  }
}

const quoteIdent = (name: string, dialect: SqlDialect): string =>
  dialect === 'mysql' ? '`' + name.replace(/`/g, '``') + '`' : '"' + name.replace(/"/g, '""') + '"'

const quoteLiteral = (text: string): string => "'" + text.replace(/'/g, "''") + "'"

const literal = (value: unknown, dialect: SqlDialect): string => {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (typeof value === 'boolean') return dialect === 'postgres' ? (value ? 'TRUE' : 'FALSE') : value ? '1' : '0'
  if (typeof value === 'string') return quoteLiteral(value)
  return quoteLiteral(JSON.stringify(value))
}

const sanitizeTableName = (raw: string): string => {
  const cleaned = raw.replace(/[^0-9A-Za-z_]/g, '_').replace(/^_+/, '').replace(/^(\d)/, '_$1')
  return cleaned || 'data_rows'
}

/** 按行数据推断列类型；missing 字段视为 null（可空） */
const inferColumns = (columns: string[], rows: Record<string, unknown>[]): ColumnSpec[] => {
  const specs = new Map<string, ColumnSpec>(columns.map(name => [name, {
    name, type: 'text', maxLength: 0, nullable: false, seen: false,
  }]))
  for (const row of rows) {
    for (const spec of specs.values()) {
      const raw = row[spec.name]
      if (!(spec.name in row) || raw === null || raw === undefined) {
        spec.nullable = true
        continue
      }
      const kind = classify(raw)
      if (!kind) {
        spec.nullable = true
        continue
      }
      spec.type = spec.seen ? widen(spec.type, kind) : kind
      if (typeof raw === 'string') spec.maxLength = Math.max(spec.maxLength, raw.length)
      spec.seen = true
    }
  }
  return [...specs.values()]
}

/** 对象数组 → SQL 文本（CREATE TABLE + 批量 INSERT） */
export const exportSql = (input: string, options: SqlExportOptions = {}): TransformResult => {
  const { parsed, error } = tryParseJson(input)
  if (error) return { result: '', error }
  if (typeof parsed !== 'object' || parsed === null) return { result: '', error: '输入不是 JSON 对象或数组' }
  const table = buildTable(parsed)
  if (!table) return { result: '', error: '未找到对象数组（需要根数组或根下的对象数组字段）' }

  const dialect: SqlDialect = options.dialect ?? 'postgres'
  const includeCreate = options.includeCreate ?? true
  const batchSize = Math.max(1, options.batchSize ?? 200)
  const tableName = sanitizeTableName(options.table?.trim() || (table.path.length ? String(table.path[0]) : 'data_rows'))
  const quoted = quoteIdent(tableName, dialect)
  const specs = inferColumns(table.columns, table.rows)
  const used = specs.filter(s => s.seen)
  if (!used.length) return { result: '', error: '对象数组为空或所有字段都是 null，无法推断列类型' }

  const lines: string[] = []
  if (includeCreate) {
    const defs = used.map(s => `  ${quoteIdent(s.name, dialect)} ${columnType(s, dialect)}${s.nullable ? '' : ' NOT NULL'}`)
    lines.push(`CREATE TABLE ${quoted} (`, defs.join(',\n'), ');', '')
  }

  const colList = used.map(s => quoteIdent(s.name, dialect)).join(', ')
  for (let start = 0; start < table.rows.length; start += batchSize) {
    const chunk = table.rows.slice(start, start + batchSize)
    const values = chunk.map(r => `  (${used.map(s => literal(r[s.name], dialect)).join(', ')})`)
    lines.push(`INSERT INTO ${quoted} (${colList}) VALUES`, values.join(',\n') + ';')
  }
  return { result: lines.join('\n'), error: null }
}
