import { useMemo, useState, useRef, useEffect, useDeferredValue } from 'react'
import { useAppStore } from '../store'
import { BackIcon, DownloadIcon } from './Icons'
import { SAMPLE_JSON } from '../utils/sample'
import { copyToClipboard } from '../utils/json'
import { buildTable } from '../utils/table'

/**
 * 表格视图：把「对象数组」渲染成电子表格。
 * - 顶层是数组且元素全为对象 → 直接渲染
 * - 否则找第一个「对象数组」字段自动下钻（如 data.items）
 * - 列 = 所有行键的并集；单元格值用紧凑 JSON 展示
 * - 支持点击列头排序、点击行复制整行 JSON
 */

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

  // 导出 Markdown / CSV 表格（复制到剪贴板）
  // 列统计：每列 null / 类型分布（点击「统计」开关）
  const RENDER_LIMIT = 5000
  const columnStats = useMemo(() => {
    if (!table) return []
    return visibleColumns.map(col => {
      const counts = { null: 0, empty: 0, number: 0, string: 0, boolean: 0, object: 0 }
      for (const row of table.rows) {
        const v = row[col]
        if (v === undefined) counts.empty++
        else if (v === null) counts.null++
        else if (typeof v === 'number') counts.number++
        else if (typeof v === 'string') counts.string++
        else if (typeof v === 'boolean') counts.boolean++
        else counts.object++
      }
      const parts: string[] = []
      if (counts.string) parts.push(`字符串 ${counts.string}`)
      if (counts.number) parts.push(`数字 ${counts.number}`)
      if (counts.boolean) parts.push(`布尔 ${counts.boolean}`)
      if (counts.object) parts.push(`对象 ${counts.object}`)
      if (counts.null) parts.push(`null ${counts.null}`)
      if (counts.empty) parts.push(`缺失 ${counts.empty}`)
      // 数字列附Sum/Avg
      if (counts.number) {
        let sum = 0
        for (const row of table.rows) {
          const v = row[col]
          if (typeof v === 'number') sum += v
        }
        const avg = sum / counts.number
        const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
        parts.push(`Σ ${fmt(sum)}`, `Avg ${fmt(avg)}`)
      }
      return { col, summary: parts.join(' · ') || '—' }
    })
  }, [table])

  const [showStats, setShowStats] = useState(false)
  const [filter, setFilter] = useState('')
  // 大表格过滤输入防卡顿：输入框即时响应，过滤计算延迟一帧
  const deferredFilter = useDeferredValue(filter)
  const [colWidths, setColWidths] = useState<Record<string, number>>({})
  const [hiddenCols, setHiddenCols] = useState<string[]>([])
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [dragCol, setDragCol] = useState<string | null>(null)
  const resizing = useRef<{ col: string; startX: number; startW: number } | null>(null)

  // 列宽拖拽：按住列头右侧手柄左右调整
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = resizing.current
      if (!r) return
      const w = Math.max(60, Math.min(640, r.startW + e.clientX - r.startX))
      setColWidths(prev => ({ ...prev, [r.col]: w }))
    }
    const onUp = () => { resizing.current = null; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const startResize = (e: React.MouseEvent, col: string) => {
    e.stopPropagation()
    e.preventDefault()
    resizing.current = { col, startX: e.clientX, startW: colWidths[col] ?? 140 }
  }

  // 列隐藏：右键列头隐藏；顶栏可恢复
  const orderedColumns = useMemo(() => {
    if (!table) return []
    const cols = table.columns.filter(c => !hiddenCols.includes(c))
    if (columnOrder.length === 0) return cols
    // 按 columnOrder 排序，未出现在 order 中的列按原顺序附后
    return [...columnOrder.filter(c => cols.includes(c)), ...cols.filter(c => !columnOrder.includes(c))]
  }, [table, hiddenCols, columnOrder])
  const visibleColumns = orderedColumns
  const hideColumn = (col: string) => setHiddenCols(prev => [...prev, col])

  // 列重排：拖拽列头到目标列
  const reorderColumn = (from: string, to: string) => {
    if (from === to) return
    setColumnOrder(prev => {
      const base = prev.length ? prev : table!.columns.filter(c => !hiddenCols.includes(c))
      const next = base.filter(c => c !== from)
      const idx = next.indexOf(to)
      next.splice(idx >= 0 ? idx : next.length, 0, from)
      return next
    })
  }

  const filteredRows = useMemo(() => {
    const q = deferredFilter.trim().toLowerCase()
    if (!q) return sortedRows
    return sortedRows.filter(({ row }) =>
      Object.values(row).some(v => cellText(v).toLowerCase().includes(q)))
  }, [sortedRows, deferredFilter])

  const exportTable = async (fmt: 'markdown' | 'csv') => {
    if (!table) return
    const cols = table.columns
    const mdEscape = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
    const csvEscape = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
    let text = ''
    if (fmt === 'markdown') {
      const header = `| ${cols.map(mdEscape).join(' | ')} |`
      const sep = `| ${cols.map(() => '---').join(' | ')} |`
      const rows = sortedRows.map(({ row }) => `| ${cols.map(c => mdEscape(cellText(row[c]))).join(' | ')} |`)
      text = [header, sep, ...rows].join('\n')
    } else {
      const header = cols.map(c => csvEscape(c)).join(',')
      const rows = sortedRows.map(({ row }) => cols.map(c => csvEscape(cellText(row[c]))).join(','))
      text = [header, ...rows].join('\n')
    }
    const ok = await copyToClipboard(text)
    showToast(ok ? `已复制 ${fmt === 'markdown' ? 'Markdown' : 'CSV'} 表格` : '复制失败')
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

  // 添加行：克隆末行结构，值置空，写回编辑器
  const addRow = () => {
    if (!table) return
    try {
      const doc = JSON.parse(content)
      let arr: unknown = doc
      for (const key of table.path) arr = (arr as Record<string, unknown>)[key]
      if (!Array.isArray(arr)) { showToast('无法添加行'); return }
      const last = arr.length > 0 ? arr[arr.length - 1] : null
      const empty = last && typeof last === 'object' && !Array.isArray(last)
        ? Object.fromEntries(Object.entries(last as Record<string, unknown>).map(([k, v]) => {
            if (typeof v === 'string') return [k, '']
            if (typeof v === 'number') return [k, 0]
            if (typeof v === 'boolean') return [k, false]
            return [k, null]
          }))
        : null
      arr.push(empty)
      setContent(JSON.stringify(doc, null, 2))
      showToast('已添加行')
    } catch {
      showToast('添加失败')
    }
  }

  // 删除行（行序号为索引，写回编辑器）
  const deleteRow = (idx: number) => {
    if (!table) return
    try {
      const doc = JSON.parse(content)
      let arr: unknown = doc
      for (const key of table.path) arr = (arr as Record<string, unknown>)[key]
      if (!Array.isArray(arr)) { showToast('无法删除行'); return }
      if (arr.length <= 1) { showToast('至少保留一行'); return }
      arr.splice(idx, 1)
      setContent(JSON.stringify(doc, null, 2))
      showToast('已删除行')
    } catch {
      showToast('删除失败')
    }
  }

  // 空状态也要有顶栏（含返回按钮），否则表格模式下无法回到编辑器
  const emptyTopbar = (
    <div className="table-topbar">
      <button className="tool-back-flat" onClick={() => useAppStore.setState({ mode: 'edit' })} title="返回">
        <BackIcon />
      </button>
      <span className="table-title">表格</span>
      <div className="table-spacer" />
    </div>
  )

  if (!content.trim()) {
    return (
      <div className="table-shell">
        {emptyTopbar}
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
        {emptyTopbar}
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
        <span className="table-meta">{table.rows.length} 行 × {table.columns.length} 列{sortKey ? ` · 按 ${sortKey} ${sortAsc ? '升序' : '降序'}` : ''}{filter ? ' · 已过滤' : ''}{table.rows.length > RENDER_LIMIT ? ' · 仅渲染前 5000 行' : ''}</span>
        <div className="table-spacer" />
        <input
          className="table-filter"
          value={filter}
          placeholder="过滤行…"
          aria-label="过滤行"
          spellCheck={false}
          onChange={e => setFilter(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setFilter('') } }}
        />
        <button className="tool-back-flat" onClick={addRow} title="添加一行（克隆末行结构）">
          + 行
        </button>
        <button className="tool-back-flat" onClick={() => setShowStats(v => !v)} title="显示/隐藏列统计">
          统计
        </button>
        <button className="tool-back-flat" onClick={() => exportTable('markdown')} title="复制为 Markdown 表格">
          <DownloadIcon size={13} /> MD
        </button>
        <button className="tool-back-flat" onClick={() => exportTable('csv')} title="复制为 CSV">
          <DownloadIcon size={13} /> CSV
        </button>
        <button
          className="tool-back-flat"
          title="把当前表格保存为 CSV 文件"
          onClick={async () => {
            if (!table) return
            const cols = visibleColumns.length ? visibleColumns : table.columns
            const csvEscape = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
            const header = cols.map(c => csvEscape(c)).join(',')
            const rows = sortedRows.map(({ row }) => cols.map(c => csvEscape(cellText(row[c]))).join(','))
            const { saveTextFileAs } = await import('../utils/files')
            const path = await saveTextFileAs([header, ...rows].join('\n'), 'table.csv')
            if (path) showToast('CSV 已保存')
          }}
        >
          保存
        </button>
        <span className="table-hint">点击列头排序 · 拖拽列头重排 · 双击单元格编辑</span>
        {hiddenCols.length > 0 && (
          <button
            className="tool-back-flat"
            title="恢复隐藏的列与列宽"
            onClick={() => { setHiddenCols([]); setColWidths({}); setColumnOrder([]) }}
          >已隐藏 {hiddenCols.length} 列 · 恢复</button>
        )}
      </div>
      {showStats && (
        <div className="table-stats">
          {columnStats.map(s => (
            <div key={s.col} className="table-stat-item">
              <span className="table-stat-col">{s.col}</span>
              <span className="table-stat-val">{s.summary}</span>
            </div>
          ))}
        </div>
      )}
      <div className="table-scroll">
        <table className="grid-table">
          <thead>
            <tr>
              <th className="grid-index">#</th>              {visibleColumns.map(col => (
                <th
                  key={col}
                  className={sortKey === col ? 'sorted' : ''}
                  style={colWidths[col] ? { width: colWidths[col], minWidth: colWidths[col] } : undefined}
                  onClick={() => toggleSort(col)}
                  onContextMenu={e => { e.preventDefault(); hideColumn(col) }}
                  title={`${col}（右键隐藏列 · 拖拽重排）`}
                  draggable
                  onDragStart={() => setDragCol(col)}
                  onDragOver={e => { if (dragCol && dragCol !== col) e.preventDefault() }}
                  onDrop={e => { e.preventDefault(); if (dragCol) reorderColumn(dragCol, col); setDragCol(null) }}
                  onDragEnd={() => setDragCol(null)}
                >
                  <span className="grid-col-name">{col}</span>
                  <span className="grid-sort-mark">{sortKey === col ? (sortAsc ? '↑' : '↓') : ''}</span>
                  <span
                    className="grid-col-resizer"
                    onMouseDown={e => startResize(e, col)}
                    onClick={e => e.stopPropagation()}
                    title="拖动调整列宽"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted-foreground, #5c6372)' }}>
                  无匹配行
                  {filter && (
                    <button className="tool-back-flat" style={{ marginLeft: 8 }} onClick={() => setFilter('')}>清除过滤</button>
                  )}
                </td>
              </tr>
            ) : filteredRows.slice(0, RENDER_LIMIT).map(({ row, idx }, i) => (
              <tr key={idx} onClick={() => copyRow(row)} title="点击复制整行 JSON · 双击单元格编辑">
                <td className="grid-index">
                  <span className="grid-index-num">{i + 1}</span>
                  <button
                    className="row-del"
                    title="删除该行"
                    aria-label="删除该行"
                    onClick={e => { e.stopPropagation(); deleteRow(idx) }}
                  >×</button>
                </td>
                {visibleColumns.map(col => {
                  const v = row[col]
                  const isObj = v !== null && typeof v === 'object'
                  const isNum = typeof v === 'number'
                  const isEditing = editing?.rowIndex === idx && editing?.col === col
                  return (
                    <td key={col} className={`${isObj ? 'grid-obj ' : ''}${isNum ? 'grid-num' : ''}`}>
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
                        >{typeof v === 'string' && /^https?:\/\//.test(v)
                          ? <a className="grid-link" href={v} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{v}</a>
                          : cellText(v)}</span>
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
