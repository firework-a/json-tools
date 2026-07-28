import { useState, useMemo } from 'react'
import { useAppStore } from '../store'
import { TreeIcon, SearchIcon, CloseIcon, InfoIcon, MoreIcon } from './Icons'

interface TNProps {
  keyName: string | number
  value: any
  depth: number
}
function preview(v: any): { text: string; color: string } {
  if (v === null) return { text: 'null', color: '#c586c0' }
  if (Array.isArray(v)) return { text: `Array(${v.length})`, color: '#4ec9b0' }
  const t = typeof v
  if (t === 'object') return { text: `{${Object.keys(v).length}}`, color: '#9cdcfe' }
  if (t === 'string') return { text: `"${v.length > 24 ? v.slice(0, 24) + '…' : v}"`, color: '#ce9178' }
  if (t === 'number') return { text: String(v), color: '#b5cea8' }
  if (t === 'boolean') return { text: String(v), color: '#569cd6' }
  return { text: t, color: '#d4d4d4' }
}

function TreeNode({ keyName, value, depth }: TNProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const isContainer = value !== null && typeof value === 'object'
  const { text, color } = preview(value)

  return (
    <div>
      <div className="tree-row" style={{ paddingLeft: depth * 14 + 6 }}
        onClick={isContainer ? () => setExpanded(v => !v) : undefined}>
        <span className={`tree-arrow ${isContainer ? expanded ? 'open' : 'closed' : 'leaf'}`}>
          {isContainer ? (expanded ? '▾' : '▸') : '·'}
        </span>
        <span className="tree-key">{String(keyName)}</span>
        {isContainer && <span className="tree-sep">:</span>}
        {(!isContainer || !expanded) && <span className="tree-prev" style={{ color }}>{text}</span>}
      </div>
      {isContainer && expanded && (
        Array.isArray(value)
          ? value.map((it, i) => <TreeNode key={i} keyName={i} value={it} depth={depth + 1} />)
          : Object.entries(value).map(([k, v]) => <TreeNode key={k} keyName={k} value={v} depth={depth + 1} />)
      )}
    </div>
  )
}

function TreeView() {
  const content = useAppStore(s => s.content)
  const treeOpen = useAppStore(s => s.treeOpen)
  const setTreeOpen = useAppStore(s => s.setTreeOpen)

  const parsed = useMemo(() => {
    const t = content.trim()
    if (!t) return null
    try { return JSON.parse(t) } catch { return null }
  }, [content])

  if (!treeOpen) return null

  return (
    <aside className="tree-panel">
      <div className="tree-header">
        <div className="tree-title-wrap">
          <span className="tree-icon"><TreeIcon /></span>
          <span className="tree-title">树形视图</span>
        </div>
        <button className="tree-icon-btn" onClick={() => setTreeOpen(false)}><CloseIcon size={13} /></button>
      </div>
      <div className="tree-search">
        <div className="tree-search-box">
          <SearchIcon size={13} />
          <input placeholder="JMESPath 查询…" />
        </div>
        <select className="tree-lang" defaultValue="jmespath">
          <option value="jmespath">JMESPath</option>
        </select>
        <button className="tree-icon-btn"><InfoIcon size={13} /></button>
        <button className="tree-icon-btn"><MoreIcon size={13} /></button>
      </div>
      <div className="tree-content">
        {parsed === null ? (
          <div className="tree-empty">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6">
              <rect x="4" y="4" width="6" height="6" rx="1"/>
              <rect x="14" y="4" width="6" height="6" rx="1"/>
              <rect x="4" y="14" width="6" height="6" rx="1"/>
              <rect x="14" y="14" width="6" height="6" rx="1"/>
            </svg>
            <div className="tree-empty-title">暂无 JSON 数据</div>
            <div className="tree-empty-tip">输入有效的 JSON 查看结构</div>
          </div>
        ) : (
          <TreeNode keyName="$" value={parsed} depth={0} />
        )}
      </div>
    </aside>
  )
}

export default TreeView
