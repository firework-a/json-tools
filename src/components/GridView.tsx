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
  /** 指向该数组在文档中的路径（根数组为 []，root.items 为 ['items']） */
  path: (string | number)[]
}

const buildTable = (parsed: unknown): TableData | null => {
  const isObjArr = (v: unknown): v is Record<string, unknown>[] =>
    Array.isArray(v) && v.length > 0 && v.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))

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
  return { rows, columns, title, path }
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
  const setContent = useAppStore(s => s.setContent)
  const showToast = useAppStore(s => s.showToast)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [editing, setEditing] = useState<{ rowIndex: number; col: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  const table = useMemo(() => {
    try {
      return buildTable(JSON.parse(content))
    } catch {
      return null
    }
  }, [content])

  // 排序后仍携带原始索引，编辑写回时定位原始行
  const sortedRows = useMemo(() => {
    if (!table) return []
    const indexed = table.rows.map((row, idx) => ({ row, idx }))
    if (!sortKey) return indexed
    indexed.sort((a, b) => {
      const av = a.row[sortKey]
      const bv = b.row[sortKey]
      if (av === undefined) return 1
      if (bv === undefined) return -1
      const an = typeof av === 'number'
      const bn = typeof bv === 'number'
      if (an && bn) return (av as number) - (bv as number)
      return String(av).localeCompare(String(bv))
    })
    return sortAsc ? indexed : indexed.reverse()
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

  // 单元格编辑：把输入解析为标量（数字/布尔/null），写回文档对应路径
  const parseCell = (raw: string): unknown => {
    const t = raw.trim()
    if (t === '') return ''
    if (t === 'null') return null
    if (t === 'true') return true
    if (t === 'false') return false
    if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
    return raw
  }

  const setEditingCell = (rowIndex: number, col: string, current: unknown, isObj: boolean) => {
    if (isObj) return
    setEditing({ rowIndex, col })
    setEditValue(cellText(current))
  }

  const commitEdit = () => {
    if (!editing || !table) { setEditing(null); return }
    const { rowIndex, col } = editing
    try {
      const doc = JSON.parse(content)
      // 按 path 定位数组（根数组为 []）
      let arr: unknown = doc
      for (const key of table.path) arr = (arr as Record<string, unknown>)[key]
      if (!Array.isArray(arr)) { setEditing(null); return }
      const row = arr[rowIndex]
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        ;(row as Record<string, unknown>)[col] = parseCell(editValue)
        setContent(JSON.stringify(doc, null, 2))
        showToast('已更新单元格')
      }
    } catch {
      showToast('更新失败')
    }
    setEditing(null)
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
        <span className="table-hint">点击列头排序 · 点击行复制 · 双击单元格编辑</span>
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
            {sortedRows.map(({ row, idx }, i) => (
              <tr key={idx} onClick={() => copyRow(row)} title="点击复制整行 JSON · 双击单元格编辑">
                <td className="grid-index">{i + 1}</td>
                {table.columns.map(col => {
                  const v = row[col]
                  const isObj = v !== null && typeof v === 'object'
                  const isEditing = editing?.rowIndex === idx && editing?.col === col
                  return (
                    <td key={col} className={isObj ? 'grid-obj' : ''}>
                      {isEditing ? (
                        <input
                          className="grid-cell-input"
                          value={editValue}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') setEditing(null)
                          }}
                        />
                      ) : (
                        <span
                          className="grid-cell"
                          title={isObj ? JSON.stringify(v) : cellText(v)}
                          onDoubleClick={e => { e.stopPropagation(); setEditingCell(idx, col, v, isObj) }}
                        >{cellText(v)}</span>
                      )}
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
