import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import JsonView from '@uiw/react-json-view'
import { lightTheme } from '@uiw/react-json-view/light'
import { darkTheme } from '@uiw/react-json-view/dark'
import { search as jmesSearch } from 'jmespath'
import { useAppStore } from '../store'
import { onEditorScroll } from '../editorRegistry'
import { TreeIcon, SearchIcon, CloseIcon, InfoIcon, CopyIcon, ChevronsUpDown, ChevronsDownUp, ExternalLinkIcon, PathIcon } from './Icons'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

/** 把 JsonView 的 keys 路径数组转成 JMESPath 风格字符串，如 people[0].name */
const keysToPath = (keys: (string | number)[]): string =>
  keys.reduce<string>((acc, k) => {
    if (typeof k === 'number') return `${acc}[${k}]`
    return acc ? `${acc}.${k}` : String(k)
  }, '')

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
  // 树形解析较重（JSON.parse + 大量 DOM），防抖避免大文件每次按键重解析
  const debouncedContent = useDebouncedValue(content, 250)
  const treeOpen = useAppStore(s => s.treeOpen)
  const theme = useAppStore(s => s.theme)
  const setTreeOpen = useAppStore(s => s.setTreeOpen)
  const jmesHistory = useAppStore(s => s.jmesHistory)
  const addJmesHistory = useAppStore(s => s.addJmesHistory)
  const showToast = useAppStore(s => s.showToast)
  const [showHelp, setShowHelp] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [pathMode, setPathMode] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)

  const isLight = theme === 'light'

  // 跟随编辑器按比例滚动
  useEffect(() => {
    const off = onEditorScroll((ratio) => {
      const el = scrollRef.current
      if (!el || syncingRef.current) return
      syncingRef.current = true
      const max = el.scrollHeight - el.clientHeight
      el.scrollTop = ratio * max
      requestAnimationFrame(() => { syncingRef.current = false })
    })
    return off
  }, [])
  const searchStyle: React.CSSProperties = isLight ? { background: '#f5f7fa', borderColor: '#d9dee7' } : {}
  const inputStyle: React.CSSProperties = isLight ? { color: '#1f2937' } : {}
  const btnStyle: React.CSSProperties = isLight ? { color: '#64748b' } : {}
  const titleStyle: React.CSSProperties = isLight ? { color: '#1f2937' } : {}

  const parsed = useMemo(() => {
    const t = debouncedContent.trim()
    if (!t) return undefined
    try { return JSON.parse(t) } catch { return undefined }
  }, [debouncedContent])

  const [query, setQuery] = useState('')

  // 对已解析的 JSON 执行 JMESPath 查询。
  // 返回三态：未触发 / 成功（结果值）/ 失败（错误信息），供界面分别处理。
  const queryResult = useMemo<{
    active: boolean
    value?: unknown
    error?: string
  }>(() => {
    const expr = query.trim()
    if (!expr || parsed === undefined) return { active: false }
    try {
      return { active: true, value: jmesSearch(parsed, expr) }
    } catch (e) {
      return { active: true, error: e instanceof Error ? e.message : String(e) }
    }
  }, [query, parsed])

  // 查询命中时展示查询结果，否则展示整份 JSON；两者都归一为对象/数组供 JsonView 渲染
  const viewData = useMemo(() => {
    if (queryResult.active) {
      const v = queryResult.value
      if (v === undefined || v === null) return undefined
      return typeof v === 'object' ? v : { result: v }
    }
    return parsed
  }, [queryResult, parsed])

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
          <input
            placeholder="JMESPath 查询…"
            style={inputStyle}
            value={query}
            onFocus={() => setHistoryOpen(true)}
            onBlur={() => setTimeout(() => setHistoryOpen(false), 150)}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && query.trim()) addJmesHistory(query) }}
          />
          {query && (
            <button
              className="tree-icon-btn"
              style={btnStyle}
              title="清空查询"
              onClick={() => setQuery('')}
            >
              <CloseIcon size={13} color={isLight ? '#64748b' : undefined} />
            </button>
          )}
          {historyOpen && jmesHistory.length > 0 && (
            <div className="tree-history" onMouseDown={e => e.preventDefault()}>
              <div className="tree-history-title">最近查询</div>
              {jmesHistory.map(h => (
                <button
                  key={h}
                  className="tree-history-item"
                  onClick={() => { setQuery(h); addJmesHistory(h) }}
                >
                  <SearchIcon size={11} color={isLight ? '#94a3b8' : undefined} />
                  <span>{h}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="tree-lang-badge">JMESPath</span>
        <button
          className={`tree-icon-btn ${pathMode ? 'selected' : ''}`}
          style={pathMode ? { color: '#5a9cf0', background: 'rgba(90,156,240,0.14)' } : btnStyle}
          title={pathMode ? '复制模式：节点路径（点击切回值）' : '复制模式：节点值（点击切到路径）'}
          onClick={() => setPathMode(v => !v)}
        >
          <PathIcon size={13} color={pathMode ? '#5a9cf0' : (isLight ? '#64748b' : undefined)} />
        </button>
        <button className="tree-icon-btn" style={btnStyle} title="JMESPath 速查表" onClick={() => setShowHelp(true)}><InfoIcon size={13} color={isLight ? '#64748b' : undefined} /></button>
        <button className="tree-icon-btn" style={btnStyle} title={collapsed ? '全部展开' : '全部收起'} onClick={() => setCollapsed(v => !v)}>
          {collapsed
            ? <ChevronsUpDown size={13} color={isLight ? '#64748b' : undefined} />
            : <ChevronsDownUp size={13} color={isLight ? '#64748b' : undefined} />}
        </button>
      </div>
      <div className="tree-content" ref={scrollRef}>
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
        ) : queryResult.active && queryResult.error ? (
          <div className="tree-empty">
            <div className="tree-empty-title" style={{ color: '#ef4444' }}>查询语法错误</div>
            <div className="tree-empty-tip">{queryResult.error}</div>
          </div>
        ) : queryResult.active && viewData === undefined ? (
          <div className="tree-empty">
            <div className="tree-empty-title">无匹配结果</div>
            <div className="tree-empty-tip">JMESPath 表达式未命中任何数据</div>
          </div>
        ) : (
          <div className="rjv-host">
            <JsonView
              key={`${collapsed ? 'collapsed' : 'expanded'}-${queryResult.active ? 'query' : 'all'}`}
              value={viewData as object}
              displayDataTypes={false}
              displayObjectSize={true}
              enableClipboard={true}
              collapsed={collapsed ? 1 : false}
              style={isLight ? lightTheme : darkTheme}
              shortenTextAfterLength={120}
              beforeCopy={(copyText, _keyName, _value, _parent, _expandKey, keys) =>
                pathMode && keys && keys.length ? keysToPath(keys) : copyText
              }
              onCopied={(text) => showToast(pathMode ? `已复制路径 ${text}` : '已复制')}
            />
          </div>
        )}
      </div>
      {showHelp && <JmesPathCheatSheet onClose={() => setShowHelp(false)} />}
    </aside>
  )
}

export default TreeView
