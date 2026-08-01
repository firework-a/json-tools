import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../store'
import { TreeIcon, SearchIcon, CloseIcon, InfoIcon, CopyIcon, ChevronsUpDown, ChevronsDownUp, ExternalLinkIcon } from './Icons'

interface TNProps {
  keyName: string | number
  value: any
  depth: number
  expandSignal: number   // increment to force expand
  collapseSignal: number // increment to force collapse
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

function TreeNode({ keyName, value, depth, expandSignal, collapseSignal }: TNProps) {
  const isContainer = value !== null && typeof value === 'object'
  const { text, color } = preview(value)
  // 用 key 重置: 每次父级重新挂载时, 节点是新实例, useState 重新初始化为 true
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    if (!isContainer) return
    // expandSignal 从 0 变正才触发 (首次挂载不触发)
    if (expandSignal > 0) setExpanded(true)
  }, [expandSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isContainer) return
    if (collapseSignal > 0) setExpanded(false)
  }, [collapseSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="tree-row" style={{ paddingLeft: depth * 14 + 6 }}
        onClick={isContainer ? () => setExpanded(v => !v) : undefined}>
        <span className={`tree-arrow ${isContainer ? expanded ? 'open' : 'closed' : 'leaf'}`}>
          {isContainer ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .15s', transform: expanded ? 'rotate(90deg)' : 'none' }}>
              <path d="m9 18 6-6-6-6"/>
            </svg>
          ) : (
            <span className="tree-leaf-dot" />
          )}
        </span>
        <span className="tree-key">{String(keyName)}</span>
        {isContainer && <span className="tree-sep">:</span>}
        {(!isContainer || !expanded) && <span className="tree-prev" style={{ color }}>{text}</span>}
      </div>
      {isContainer && expanded && (
        Array.isArray(value)
          ? value.map((it, i) => <TreeNode key={i} keyName={i} value={it} depth={depth + 1} expandSignal={expandSignal} collapseSignal={collapseSignal} />)
          : Object.entries(value).map(([k, v]) => <TreeNode key={k} keyName={k} value={v} depth={depth + 1} expandSignal={expandSignal} collapseSignal={collapseSignal} />)
      )}
    </div>
  )
}

function JmesPathCheatSheet({ onClose }: { onClose: () => void }) {
  const exampleJson = `{
  "people": [
    {"name": "Alice", "age": 20},
    {"name": "Bob",   "age": 30}
  ],
  "meta": {"count": 2}
}`
  const examples = [
    { expr: 'people[0].name', result: '"Alice"' },
    { expr: 'people[*].name', result: '["Alice", "Bob"]' },
    { expr: 'people[?age > `25`].name', result: '["Bob"]' },
    { expr: 'meta.count', result: '2' },
    { expr: 'length(people)', result: '2' },
  ]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="jmespath-overlay" onClick={onClose}>
      <div className="jmespath-panel" onClick={e => e.stopPropagation()}>
        <div className="jmespath-header">
          <span className="jmespath-title">JMESPath 速查表</span>
          <a className="jmespath-docs" href="https://jmespath.org/tutorial.html" target="_blank" rel="noreferrer">
            文档 <ExternalLinkIcon size={12} />
          </a>
        </div>
        <div className="jmespath-body">
          <div className="jmespath-section-title">示例 JSON 数据</div>
          <div className="jmespath-code-block">
            <pre>{exampleJson}</pre>
            <button className="jmespath-copy" onClick={() => navigator.clipboard.writeText(exampleJson)} title="复制"><CopyIcon size={13} color="#8b92a1" /></button>
          </div>
          <div className="jmespath-section-title">示例查询</div>
          <div className="jmespath-examples">
            {examples.map((ex, i) => (
              <div className="jmespath-row" key={i}>
                <code className="jmespath-expr">{ex.expr}</code>
                <code className="jmespath-result">{ex.result}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function TreeView() {
  const content = useAppStore(s => s.content)
  const treeOpen = useAppStore(s => s.treeOpen)
  const theme = useAppStore(s => s.theme)
  const setTreeOpen = useAppStore(s => s.setTreeOpen)
  const [showHelp, setShowHelp] = useState(false)
  const [expandSignal, setExpandSignal] = useState(0)
  const [collapseSignal, setCollapseSignal] = useState(0)

  const isLight = theme === 'light'
  const searchStyle: React.CSSProperties = isLight ? { background: '#f5f7fa', borderColor: '#d9dee7' } : {}
  const inputStyle: React.CSSProperties = isLight ? { color: '#1f2937' } : {}
  const langStyle: React.CSSProperties = isLight ? { background: '#f5f7fa', borderColor: '#d9dee7', color: '#1f2937' } : {}
  const btnStyle: React.CSSProperties = isLight ? { color: '#64748b' } : {}
  const titleStyle: React.CSSProperties = isLight ? { color: '#1f2937' } : {}

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
          <span className="tree-title" style={titleStyle}>树形视图</span>
        </div>
        <button className="tree-icon-btn" style={btnStyle} onClick={() => setTreeOpen(false)}><CloseIcon size={13} color={isLight ? '#64748b' : undefined} /></button>
      </div>
      <div className="tree-search">
        <div className="tree-search-box" style={searchStyle}>
          <SearchIcon size={13} color={isLight ? '#94a3b8' : undefined} />
          <input placeholder="JMESPath 查询…" style={inputStyle} />
        </div>
        <select className="tree-lang" defaultValue="jmespath" style={langStyle}>
          <option value="jmespath">JMESPath</option>
        </select>
        <button className="tree-icon-btn" style={btnStyle} title="JMESPath 速查表" onClick={() => setShowHelp(true)}><InfoIcon size={13} color={isLight ? '#64748b' : undefined} /></button>
        <button className="tree-icon-btn" style={btnStyle} title={collapseSignal >= expandSignal ? '全部展开' : '全部收起'} onClick={() => {
          if (collapseSignal >= expandSignal) setExpandSignal(v => v + 1)
          else setCollapseSignal(v => v + 1)
        }}>{collapseSignal >= expandSignal
          ? <ChevronsUpDown size={13} color={isLight ? '#64748b' : undefined} />
          : <ChevronsDownUp size={13} color={isLight ? '#64748b' : undefined} />
        }</button>
      </div>
      <div className="tree-content">
        {parsed === null ? (
          <div className="tree-empty">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
              <line x1="6" x2="6" y1="3" y2="15"/>
              <circle cx="18" cy="6" r="3"/>
              <circle cx="6" cy="18" r="3"/>
              <path d="M18 9a9 9 0 0 1-9 9"/>
            </svg>
            <div className="tree-empty-title">暂无 JSON 数据</div>
            <div className="tree-empty-tip">输入有效的 JSON 查看结构</div>
          </div>
        ) : (
          <TreeNode key={content.length + '-' + content.slice(0, 50)} keyName="$" value={parsed} depth={0} expandSignal={expandSignal} collapseSignal={collapseSignal} />
        )}
      </div>
      {showHelp && <JmesPathCheatSheet onClose={() => setShowHelp(false)} />}
    </aside>
  )
}

export default TreeView
