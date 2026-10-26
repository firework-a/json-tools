import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store'
import { detectFormat } from '../utils/json'
import { sortJsonKeys, flattenJson, unflattenJson, removeEmptyValues, dedupJson } from '../utils/jsonTransform'
import {
  base64Encode, base64Decode, urlEncode, urlDecode, decodeJwt,
  hashText, convertTimestamp, convertNumberBase, HASH_ALGOS, type HashAlgo,
} from '../utils/encoding'
import { generateMock } from '../utils/mockData'
import { convertNdjson } from '../utils/ndjson'
import { analyzeJson, formatInsightsReport } from '../utils/insights'
import { convertKeys, type KeyCase } from '../utils/keyCase'
import { mergeJson, type MergeArrayStrategy } from '../utils/merge'
import { redactJson } from '../utils/redact'
import { humanizeTimestamps, toEpochTimestamps, type TimestampFormat } from '../utils/timestamps'
import { exportTable, type TableExportFormat } from '../utils/tableExport'
import { exportSql, type SqlDialect } from '../utils/sqlExport'
import { sortByField, type SortDirection } from '../utils/sortByField'
import { collectPaths } from '../utils/paths'
import { filterPaths, type PickMode } from '../utils/pickPaths'
import { BackIcon, ChevronDown } from './Icons'
import CustomSelect from './CustomSelect'

type ToolOutcome = { result: string; error: string | null; hits?: number | { path: string }[] }

/** 逗号/空格/分号分隔的列表输入 */
const splitList = (value: string) => value.split(/[\s,;、，；]+/).map(v => v.trim()).filter(Boolean)

import { TOOLS, type ToolId, type ToolMeta } from '../tools'


export default function ToolsPanel() {
  const content = useAppStore(s => s.content)
  const showToast = useAppStore(s => s.showToast)

  // 工具箱默认值来自设置页；设置变化时同步刷新当前选项
  const defKeyCase = useAppStore(s => s.toolKeyCase)
  const defRedactEdges = useAppStore(s => s.toolRedactKeepEdges)
  const defRedactKeys = useAppStore(s => s.toolRedactExtraKeys)
  const defTsFormat = useAppStore(s => s.toolTsFormat)
  const defTableFormat = useAppStore(s => s.toolTableFormat)
  const defSqlDialect = useAppStore(s => s.toolSqlDialect)
  const defSortField = useAppStore(s => s.toolSortField)
  const defPickMode = useAppStore(s => s.toolPickMode)
  const defPickPatterns = useAppStore(s => s.toolPickPatterns)

  const [tool, setTool] = useState<ToolId>('sort')
  const [input, setInput] = useState('')
  const [decode, setDecode] = useState(false)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [removeOnlyNull, setRemoveOnlyNull] = useState(true)
  const [hashAlgo, setHashAlgo] = useState<HashAlgo>('SHA-256')
  const [base, setBase] = useState(10)
  const [mockCount, setMockCount] = useState('5')
  const [ndjsonMode, setNdjsonMode] = useState('toJson')
  const [keyCaseStyle, setKeyCaseStyle] = useState<KeyCase>(defKeyCase)
  const [mergeStrategy, setMergeStrategy] = useState<MergeArrayStrategy>('replace')
  const [mergePrefer, setMergePrefer] = useState<'left' | 'right'>('right')
  const [redactEdges, setRedactEdges] = useState(defRedactEdges ? 'keep' : 'full')
  const [redactKeys, setRedactKeys] = useState(defRedactKeys)
  const [tsMode, setTsMode] = useState<'toHuman' | 'toEpoch'>('toHuman')
  const [tsFormat, setTsFormat] = useState<TimestampFormat>(defTsFormat)
  const [tableFormat, setTableFormat] = useState<TableExportFormat>(defTableFormat)
  const [sqlDialect, setSqlDialect] = useState<SqlDialect>(defSqlDialect)
  const [sqlTable, setSqlTable] = useState('')
  const [sortField, setSortField] = useState(defSortField)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [pickMode, setPickMode] = useState<PickMode>(defPickMode)
  const [pickPatterns, setPickPatterns] = useState(defPickPatterns)
  const [hashOut, setHashOut] = useState<{ result: string; error: string | null }>({ result: '', error: null })
  const [groupOpen, setGroupOpen] = useState(true)
  const toolsTool = useAppStore(s => s.toolsTool)
  const setToolsTool = useAppStore(s => s.setToolsTool)

  useEffect(() => { setKeyCaseStyle(defKeyCase) }, [defKeyCase])
  useEffect(() => { setRedactEdges(defRedactEdges ? 'keep' : 'full') }, [defRedactEdges])
  useEffect(() => { setRedactKeys(defRedactKeys) }, [defRedactKeys])
  useEffect(() => { setTsFormat(defTsFormat) }, [defTsFormat])
  useEffect(() => { setTableFormat(defTableFormat) }, [defTableFormat])
  useEffect(() => { setSqlDialect(defSqlDialect) }, [defSqlDialect])
  useEffect(() => { setSortField(defSortField) }, [defSortField])
  useEffect(() => { setPickMode(defPickMode) }, [defPickMode])
  useEffect(() => { setPickPatterns(defPickPatterns) }, [defPickPatterns])

  // 命令面板/外部跳转：把选中的工具同步进来
  useEffect(() => {
    if (toolsTool && TOOLS.some(t => t.id === toolsTool)) {
      setTool(toolsTool as ToolId)
      setHashOut({ result: '', error: null })
    }
    if (toolsTool) setToolsTool(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolsTool])

  // 进入 JSON 类工具且未输入时，用当前编辑器内容预填
  useEffect(() => {
    const meta = TOOLS.find(t => t.id === tool)
    if (meta?.json && !input.trim() && content.trim()) setInput(content)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool])

  const groups = useMemo(() => {
    const map = new Map<string, ToolMeta[]>()
    for (const t of TOOLS) {
      if (!map.has(t.group)) map.set(t.group, [])
      map.get(t.group)!.push(t)
    }
    return [...map.entries()]
  }, [])

  // 同步计算结果（哈希为异步，单独处理）
  const result = useMemo<ToolOutcome>(() => {
    if (tool === 'hash') return hashOut
    if (!input.trim()) return { result: '', error: null }
    switch (tool) {
      case 'sort': return sortJsonKeys(input, sortOrder)
      case 'flatten': return flattenJson(input)
      case 'unflatten': return unflattenJson(input)
      case 'removeEmpty': return removeEmptyValues(input, removeOnlyNull)
      case 'dedup': return dedupJson(input)
      case 'keyCase': return convertKeys(input, keyCaseStyle)
      case 'merge': return mergeJson(content, input, { arrayStrategy: mergeStrategy, prefer: mergePrefer })
      case 'redact': return redactJson(input, { keepEdges: redactEdges === 'keep', extraKeys: splitList(redactKeys) })
      case 'ts': return tsMode === 'toHuman' ? humanizeTimestamps(input, { format: tsFormat }) : toEpochTimestamps(input)
      case 'tableExport': return exportTable(input, tableFormat)
      case 'sql': return exportSql(input, { dialect: sqlDialect, table: sqlTable })
      case 'sortByField': return sortByField(input, sortField, { order: sortDirection })
      case 'paths': return collectPaths(input)
      case 'pick': return filterPaths(input, pickPatterns, pickMode)
      case 'base64': return decode ? base64Decode(input) : base64Encode(input)
      case 'url': return decode ? urlDecode(input) : urlEncode(input)
      case 'jwt': return decodeJwt(input)
      case 'timestamp': return convertTimestamp(input)
      case 'numbase': return convertNumberBase(input, base)
      case 'ndjson': return convertNdjson(input, ndjsonMode === 'toJson')
      case 'mock': return generateMock(input, Number(mockCount) || 5)
      case 'insights': {
        const r = analyzeJson(input)
        if (r.error) return { result: '', error: r.error }
        return { result: formatInsightsReport(r.result), error: null }
      }
      default: return { result: '', error: null }
    }
  }, [input, tool, decode, sortOrder, removeOnlyNull, base, hashOut, mockCount, ndjsonMode,
    keyCaseStyle, content, mergeStrategy, mergePrefer, redactEdges, redactKeys, tsMode, tsFormat, tableFormat,
    sqlDialect, sqlTable, sortField, sortDirection, pickMode, pickPatterns])

  const hitCount = Array.isArray(result.hits) ? result.hits.length : result.hits ?? 0

  // 哈希异步
  useEffect(() => {
    if (tool !== 'hash') return
    if (!input.trim()) { setHashOut({ result: '', error: null }); return }
    let cancelled = false
    const t = setTimeout(() => {
      hashText(input, hashAlgo).then(r => { if (!cancelled) setHashOut(r) })
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [tool, input, hashAlgo])

  const activeMeta = TOOLS.find(t => t.id === tool)!
  const hasOptions =
    tool === 'sort' || tool === 'removeEmpty' || tool === 'base64' || tool === 'url' || tool === 'hash' || tool === 'numbase' || tool === 'mock' || tool === 'ndjson'
    || tool === 'keyCase' || tool === 'merge' || tool === 'redact' || tool === 'ts' || tool === 'tableExport' || tool === 'sql' || tool === 'pick' || tool === 'sortByField'

  const copyOut = async () => {
    if (!result.result) { showToast('没有可复制的内容'); return }
    const { copyToClipboard } = await import('../utils/json')
    const ok = await copyToClipboard(result.result)
    showToast(ok ? '已复制' : '复制失败')
  }

  return (
    <div className="tools-shell">
      <div className="tools-sidebar">
        <div className="tools-sidebar-head" onClick={() => setGroupOpen(v => !v)}>
          <span>工具箱</span>
          <ChevronDown size={12} className={groupOpen ? '' : 'collapsed'} />
        </div>
        {groupOpen && groups.map(([group, items]) => (
          <div className="tools-group" key={group}>
            <div className="tools-group-title">{group}</div>
            {items.map(t => (
              <button
                key={t.id}
                className={`tools-item ${t.id === tool ? 'active' : ''}`}
                onClick={() => { setTool(t.id); setHashOut({ result: '', error: null }) }}
              >
                {t.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="tools-main">
        <div className="tools-topbar">
          <button className="tool-back-flat" onClick={() => useAppStore.setState({ mode: 'edit' })} title="返回">
            <BackIcon />
          </button>
          <span className="pill active blue">{activeMeta.label}</span>
          {hasOptions && (
            <div className="tools-options">
              {(tool === 'sort') && (
                <CustomSelect
                  value={sortOrder}
                  onChange={v => setSortOrder(v as 'asc' | 'desc')}
                  minWidth={120}
                  options={[{ value: 'asc', label: '键升序 (A→Z)' }, { value: 'desc', label: '键降序 (Z→A)' }]}
                />
              )}
              {tool === 'removeEmpty' && (
                <CustomSelect
                  value={removeOnlyNull ? 'null' : 'all'}
                  onChange={v => setRemoveOnlyNull(v === 'null')}
                  minWidth={110}
                  options={[{ value: 'null', label: '仅去 null' }, { value: 'all', label: '去所有空值' }]}
                />
              )}
              {(tool === 'base64' || tool === 'url') && (
                <CustomSelect
                  value={decode ? 'dec' : 'enc'}
                  onChange={v => setDecode(v === 'dec')}
                  minWidth={80}
                  options={[{ value: 'enc', label: '编码' }, { value: 'dec', label: '解码' }]}
                />
              )}
              {tool === 'hash' && (
                <CustomSelect
                  value={hashAlgo}
                  onChange={v => setHashAlgo(v as HashAlgo)}
                  minWidth={100}
                  options={HASH_ALGOS.map(a => ({ value: a, label: a }))}
                />
              )}
              {tool === 'mock' && (
                <CustomSelect
                  value={mockCount}
                  onChange={v => setMockCount(v)}
                  minWidth={92}
                  options={['1', '5', '10', '20', '50'].map(n => ({ value: n, label: `${n} 条` }))}
                />
              )}
              {tool === 'ndjson' && (
                <CustomSelect
                  value={ndjsonMode}
                  onChange={v => setNdjsonMode(v)}
                  minWidth={130}
                  options={[
                    { value: 'toJson', label: 'NDJSON → JSON' },
                    { value: 'toNd', label: 'JSON → NDJSON' },
                  ]}
                />
              )}
              {tool === 'numbase' && (
                <CustomSelect
                  value={String(base)}
                  onChange={v => setBase(Number(v))}
                  minWidth={92}
                  options={[
                    { value: '2', label: '二进制' },
                    { value: '8', label: '八进制' },
                    { value: '10', label: '十进制' },
                    { value: '16', label: '十六进制' },
                  ]}
                />
              )}
              {tool === 'keyCase' && (
                <CustomSelect
                  value={keyCaseStyle}
                  onChange={v => setKeyCaseStyle(v as KeyCase)}
                  minWidth={120}
                  options={[
                    { value: 'camel', label: 'camelCase' },
                    { value: 'snake', label: 'snake_case' },
                    { value: 'kebab', label: 'kebab-case' },
                    { value: 'pascal', label: 'PascalCase' },
                  ]}
                />
              )}
              {tool === 'merge' && (
                <>
                  <CustomSelect
                    value={mergeStrategy}
                    onChange={v => setMergeStrategy(v as MergeArrayStrategy)}
                    minWidth={130}
                    options={[
                      { value: 'replace', label: '数组：整体替换' },
                      { value: 'concat', label: '数组：拼接' },
                      { value: 'union', label: '数组：并集去重' },
                    ]}
                  />
                  <CustomSelect
                    value={mergePrefer}
                    onChange={v => setMergePrefer(v as 'left' | 'right')}
                    minWidth={130}
                    options={[
                      { value: 'right', label: '标量冲突：取增量' },
                      { value: 'left', label: '标量冲突：取基准' },
                    ]}
                  />
                </>
              )}
              {tool === 'redact' && (
                <>
                  <CustomSelect
                    value={redactEdges}
                    onChange={v => setRedactEdges(v)}
                    minWidth={130}
                    options={[
                      { value: 'keep', label: '保留首尾 2 位' },
                      { value: 'full', label: '整值打码' },
                    ]}
                  />
                  <input
                    className="tools-opt-input"
                    placeholder="附加敏感键名，逗号分隔，如 openid, unionid"
                    value={redactKeys}
                    spellCheck={false}
                    onChange={e => setRedactKeys(e.target.value)}
                  />
                </>
              )}
              {tool === 'ts' && (
                <>
                  <CustomSelect
                    value={tsMode}
                    onChange={v => setTsMode(v as 'toHuman' | 'toEpoch')}
                    minWidth={140}
                    options={[
                      { value: 'toHuman', label: '时间戳 → 日期' },
                      { value: 'toEpoch', label: '日期 → 时间戳(ms)' },
                    ]}
                  />
                  {tsMode === 'toHuman' && (
                    <CustomSelect
                      value={tsFormat}
                      onChange={v => setTsFormat(v as TimestampFormat)}
                      minWidth={110}
                      options={[
                        { value: 'iso', label: 'ISO 8601' },
                        { value: 'local', label: '本地可读' },
                      ]}
                    />
                  )}
                </>
              )}
              {tool === 'tableExport' && (
                <CustomSelect
                  value={tableFormat}
                  onChange={v => setTableFormat(v as 'markdown' | 'html')}
                  minWidth={120}
                  options={[
                    { value: 'markdown', label: 'Markdown 表' },
                    { value: 'html', label: 'HTML 表' },
                  ]}
                />
              )}
              {tool === 'sql' && (
                <>
                  <CustomSelect
                    value={sqlDialect}
                    onChange={v => setSqlDialect(v as SqlDialect)}
                    minWidth={120}
                    options={[
                      { value: 'postgres', label: 'PostgreSQL' },
                      { value: 'mysql', label: 'MySQL' },
                      { value: 'sqlite', label: 'SQLite' },
                    ]}
                  />
                  <input
                    className="tools-opt-input"
                    placeholder="表名（留空取数组字段名）"
                    value={sqlTable}
                    spellCheck={false}
                    onChange={e => setSqlTable(e.target.value)}
                  />
                </>
              )}
              {tool === 'sortByField' && (
                <>
                  <input
                    className="tools-opt-input"
                    placeholder="排序字段，支持点号路径，如 score / user.name"
                    value={sortField}
                    spellCheck={false}
                    onChange={e => setSortField(e.target.value)}
                  />
                  <CustomSelect
                    value={sortDirection}
                    onChange={v => setSortDirection(v as SortDirection)}
                    minWidth={90}
                    options={[
                      { value: 'asc', label: '升序' },
                      { value: 'desc', label: '降序' },
                    ]}
                  />
                </>
              )}
              {tool === 'pick' && (
                <>
                  <CustomSelect
                    value={pickMode}
                    onChange={v => setPickMode(v as PickMode)}
                    minWidth={110}
                    options={[
                      { value: 'omit', label: '剔除这些路径' },
                      { value: 'keep', label: '只保留这些路径' },
                    ]}
                  />
                  <input
                    className="tools-opt-input wide"
                    placeholder="路径，逗号或换行分隔，如 __typename, items[*].secret"
                    value={pickPatterns}
                    spellCheck={false}
                    onChange={e => setPickPatterns(e.target.value)}
                  />
                </>
              )}
            </div>
          )}
          {activeMeta.json && (
            <button className="action-btn gen" onClick={() => setInput(content)} title="用编辑器当前内容填入">用编辑器内容</button>
          )}
          <div className="tb-spacer" />
          <button
            className="action-btn chk"
            onClick={() => {
              if (!result.result) { showToast('没有可写入的内容'); return }
              useAppStore.getState().setContent(result.result)
              useAppStore.getState().showToast('结果已写入编辑器')
            }}
          >写入编辑器</button>
          <button className="action-btn chk" onClick={copyOut}>复制结果</button>
        </div>
        <div className="tools-body">
          <div className="tools-io">
            <div className="tools-io-title">
              输入 {detectFormat(input) !== 'text' && input.trim() && <span className="tools-detect">识别为 {detectFormat(input).toUpperCase()}</span>}
              {tool === 'merge' && <span className="tools-detect">{content.trim() ? '基准 = 编辑器当前内容' : '编辑器内容为空，无合并基准'}</span>}
            </div>
            <textarea
              className="tools-input"
              name="tools-input"
              value={input}
              spellCheck={false}
              placeholder={`在此粘贴要处理的文本`}
              onChange={e => setInput(e.target.value)}
            />
          </div>
          <div className="tools-io">
            <div className="tools-io-title">
              输出 {hitCount > 0 && <span className="tools-detect">命中 {hitCount} 处</span>}
            </div>
            {result.error
              ? <div className="tools-error">{result.error}</div>
              : <pre className="tools-output">{result.result || '结果将显示在这里'}</pre>}
          </div>
        </div>
      </div>
    </div>
  )
}
