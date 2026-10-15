import { useMemo, useState } from 'react'
import { useAppStore } from '../store'
import { BackIcon } from './Icons'
import { SAMPLE_JSON } from '../utils/sample'

/**
 * 表格视图：把「对象数组」渲染成电子表格。
 * - 顶层是数组且元素全为对象 → 直接渲染
 * - 否则找第一个「对象数组」字段自动下钻（如 data.items）
 * - 列 = 所有行键的并集；单元格值用紧凑 JSON 展示
 * - 支持点击列头排序、点击行复制整行 JSON
 */
interface TableData {
  rows: Record<string, unknown>[]
  columns: string[]
  title: string
}

const buildTable = (parsed: unknown): TableData | null => {
  const isObjArr = (v: unknown): v is Record<string, unknown>[] =>
    Array.isArray(v) && v.length > 0 && v.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))

  let rows: Record<string, unknown>[] | null = null
  let title = '根数组'

  if (isObjArr(parsed)) {
    rows = parsed
  } else if (parsed && typeof parsed === 'object') {
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isObjArr(value)) {
        rows = value
        title = `root.${key}`
        break
      }
    }
  }
  if (!rows) return null

  const columns: string[] = []
  const MAX_COLUMNS = 64
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!columns.includes(k)) {
        columns.push(k)
        if (columns.length >= MAX_COLUMNS) break
      }
    }
    if (columns.length >= MAX_COLUMNS) break
  }
  return { rows, columns, title }
}

const cellText = (v: unknown): string => {
  if (v === null) return 'null'
  if (v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v)
}

export default function GridView() {
  const content = useAppStore(s => s.content)
  const showToast = useAppStore(s => s.showToast)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const table = useMemo(() => {
    try {
      return buildTable(JSON.parse(content))
    } catch {
      return null
    }
  }, [content])

  const sortedRows = useMemo(() => {
    if (!table) return []
    if (!sortKey) return table.rows
    const rows = [...table.rows]
    rows.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === undefined) return 1
      if (bv === undefined) return -1
      const an = typeof av === 'number'
      const bn = typeof bv === 'number'
      if (an && bn) return (av as number) - (bv as number)
      return String(av).localeCompare(String(bv))
    })
    return sortAsc ? rows : rows.reverse()
  }, [table, sortKey, sortAsc])

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      if (sortAsc) setSortAsc(false)
      else { setSortKey(null); setSortAsc(true) }
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const copyRow = (row: Record<string, unknown>) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2))
      .then(() => showToast('已复制整行 JSON'))
      .catch(() => showToast('复制失败'))
  }

  if (!content.trim()) {
    return (
      <div className="table-shell">
        <div className="table-empty">
          <div className="table-empty-title">没有数据</div>
          <div className="table-empty-tip">先在编辑器粘贴 JSON，或加载示例</div>
          <button
            className="editor-empty-btn primary"
            onClick={() => { useAppStore.getState().setContent(SAMPLE_JSON); useAppStore.getState().showToast('已加载示例 JSON') }}
          >
            加载示例
          </button>
        </div>
      </div>
    )
  }

  if (!table) {
    return (
      <div className="table-shell">
        <div className="table-empty">
          <div className="table-empty-title">未找到对象数组</div>
          <div className="table-empty-tip">表格视图需要「对象数组」数据，例如根数组，或根下的某个数组字段</div>
          <button
            className="editor-empty-btn primary"
            onClick={() => { useAppStore.getState().setContent(SAMPLE_JSON); useAppStore.getState().showToast('已加载示例 JSON') }}
          >
            加载示例
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="table-shell">
      <div className="table-topbar">
        <button className="tool-back-flat" onClick={() => useAppStore.setState({ mode: 'edit' })} title="返回">
          <BackIcon />
        </button>
        <span className="table-title">{table.title}</span>
        <span className="table-meta">{table.rows.length} 行 × {table.columns.length} 列{sortKey ? ` · 按 ${sortKey} ${sortAsc ? '升序' : '降序'}` : ''}</span>
        <div className="table-spacer" />
        <span className="table-hint">点击列头排序 · 点击行复制 JSON</span>
      </div>
      <div className="table-scroll">
        <table className="grid-table">
          <thead>
            <tr>
              <th className="grid-index">#</th>
              {table.columns.map(col => (
                <th key={col} className={sortKey === col ? 'sorted' : ''} onClick={() => toggleSort(col)} title={col}>
                  <span className="grid-col-name">{col}</span>
                  <span className="grid-sort-mark">{sortKey === col ? (sortAsc ? '↑' : '↓') : ''}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr key={i} onClick={() => copyRow(row)} title="点击复制整行 JSON">
                <td className="grid-index">{i + 1}</td>
                {table.columns.map(col => {
                  const v = row[col]
                  const isObj = v !== null && typeof v === 'object'
                  return (
                    <td key={col} className={isObj ? 'grid-obj' : ''}>
                      <span className="grid-cell" title={isObj ? JSON.stringify(v) : cellText(v)}>{cellText(v)}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
