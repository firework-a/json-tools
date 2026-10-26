// 表格数据构建：从 JSON 解析结果提取「对象数组 + 列并集 + 文档内路径」（MCP/CLI 的 json_table_extract 使用）

export interface TableData {
  rows: Record<string, unknown>[]
  columns: string[]
  title: string
  /** 指向该数组在文档中的路径（根数组为 []，root.items 为 ['items']） */
  path: (string | number)[]
}

const isObjArr = (v: unknown): v is Record<string, unknown>[] =>
  Array.isArray(v) && v.length > 0 && v.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))

const MAX_COLUMNS = 64

export const buildTable = (parsed: unknown): TableData | null => {
  let rows: Record<string, unknown>[] | null = null
  let title = '根数组'
  let path: (string | number)[] = []

  if (isObjArr(parsed)) {
    rows = parsed
  } else if (parsed && typeof parsed === 'object') {
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isObjArr(value)) {
        rows = value
        title = `root.${key}`
        path = [key]
        break
      }
    }
  }
  if (!rows) return null

  const columns: string[] = []
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!columns.includes(k)) {
        columns.push(k)
        if (columns.length >= MAX_COLUMNS) break
      }
    }
    if (columns.length >= MAX_COLUMNS) break
  }
  return { rows, columns, title, path }
}
