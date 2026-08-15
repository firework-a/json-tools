import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import JsonView from '@uiw/react-json-view'
import { lightTheme } from '@uiw/react-json-view/light'
import { darkTheme } from '@uiw/react-json-view/dark'
import { useAppStore } from '../store'
import { TreeIcon, SearchIcon, CloseIcon, InfoIcon, CopyIcon, ChevronsUpDown, ChevronsDownUp, ExternalLinkIcon } from './Icons'

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
  const [collapsed, setCollapsed] = useState(false)

  const isLight = theme === 'light'
  const searchStyle: React.CSSProperties = isLight ? { background: '#f5f7fa', borderColor: '#d9dee7' } : {}
  const inputStyle: React.CSSProperties = isLight ? { color: '#1f2937' } : {}
  const langStyle: React.CSSProperties = isLight ? { background: '#f5f7fa', borderColor: '#d9dee7', color: '#1f2937' } : {}
  const btnStyle: React.CSSProperties = isLight ? { color: '#64748b' } : {}
  const titleStyle: React.CSSProperties = isLight ? { color: '#1f2937' } : {}

  const parsed = useMemo(() => {
    const t = content.trim()
    if (!t) return undefined
    try { return JSON.parse(t) } catch { return undefined }
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
        <button className="tree-icon-btn" style={btnStyle} title={collapsed ? '全部展开' : '全部收起'} onClick={() => setCollapsed(v => !v)}>
          {collapsed
            ? <ChevronsUpDown size={13} color={isLight ? '#64748b' : undefined} />
            : <ChevronsDownUp size={13} color={isLight ? '#64748b' : undefined} />}
        </button>
      </div>
      <div className="tree-content">
        {parsed === undefined ? (
          <div className="tree-empty">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
              <line x1="6" x2="6" y1="3" y2="15"/>
              <circle cx="18" cy="6" r="3"/>
              <circle cx="6" cy="18" r="3"/>
              <path d="M18 9a9 9 0 0 1-9 9"/>
            </svg>
            <div className="tree-empty-title">暂无 JSON 数据</div>
            <div className="tree-empty-tip">输入有效的 JSON 查看结构</div>
          </div>
        ) : (
          <div className="rjv-host">
            <JsonView
              key={collapsed ? 'collapsed' : 'expanded'}
              value={parsed}
              displayDataTypes={false}
              displayObjectSize={true}
              enableClipboard={true}
              collapsed={collapsed ? 1 : false}
              style={isLight ? lightTheme : darkTheme}
              shortenTextAfterLength={120}
            />
          </div>
        )}
      </div>
      {showHelp && <JmesPathCheatSheet onClose={() => setShowHelp(false)} />}
    </aside>
  )
}

export default TreeView
