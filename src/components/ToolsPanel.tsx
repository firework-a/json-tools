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
import { exportTable } from '../utils/tableExport'
import { collectPaths } from '../utils/paths'
import { BackIcon, ChevronDown } from './Icons'
import CustomSelect from './CustomSelect'

type ToolOutcome = { result: string; error: string | null; hits?: { path: string }[] }

type ToolId =
  | 'sort' | 'flatten' | 'unflatten' | 'removeEmpty' | 'dedup'
  | 'keyCase' | 'merge' | 'redact' | 'ts' | 'tableExport' | 'paths'
  | 'base64' | 'url' | 'jwt' | 'hash' | 'timestamp' | 'numbase' | 'mock' | 'ndjson' | 'insights'

interface ToolMeta { id: ToolId; label: string; group: string; json?: boolean }
const TOOLS: ToolMeta[] = [
  { id: 'sort', label: '键排序', group: 'JSON 变换', json: true },
  { id: 'flatten', label: '扁平化', group: 'JSON 变换', json: true },
  { id: 'unflatten', label: '扁平还原', group: 'JSON 变换', json: true },
  { id: 'removeEmpty', label: '去空值', group: 'JSON 变换', json: true },
  { id: 'dedup', label: '去重', group: 'JSON 变换', json: true },
  { id: 'keyCase', label: '键名风格', group: '数据处理', json: true },
  { id: 'merge', label: '深度合并', group: '数据处理', json: true },
  { id: 'redact', label: '敏感脱敏', group: '数据处理', json: true },
  { id: 'ts', label: '时间戳互转', group: '数据处理', json: true },
  { id: 'tableExport', label: '表格导出', group: '数据处理', json: true },
  { id: 'paths', label: '字段路径', group: '数据处理', json: true },
  { id: 'base64', label: 'Base64', group: '编解码' },
  { id: 'url', label: 'URL 编码', group: '编解码' },
  { id: 'jwt', label: 'JWT 解析', group: '编解码' },
  { id: 'hash', label: '哈希', group: '编解码' },
  { id: 'timestamp', label: '时间戳', group: '其他' },
  { id: 'numbase', label: '进制转换', group: '其他' },
  { id: 'mock', label: 'Mock 数据', group: '其他', json: true },
  { id: 'ndjson', label: 'NDJSON', group: '其他', json: true },
  { id: 'insights', label: '智能分析', group: '其他', json: true },
]

export default function ToolsPanel() {
  const content = useAppStore(s => s.content)
  const showToast = useAppStore(s => s.showToast)
  const [tool, setTool] = useState<ToolId>('sort')
  const [input, setInput] = useState('')
  const [decode, setDecode] = useState(false)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [removeOnlyNull, setRemoveOnlyNull] = useState(true)
  const [hashAlgo, setHashAlgo] = useState<HashAlgo>('SHA-256')
  const [base, setBase] = useState(10)
  const [mockCount, setMockCount] = useState('5')
  const [ndjsonMode, setNdjsonMode] = useState('toJson')
  const [keyCaseStyle, setKeyCaseStyle] = useState<KeyCase>('camel')
  const [mergeStrategy, setMergeStrategy] = useState<MergeArrayStrategy>('replace')
  const [mergePrefer, setMergePrefer] = useState<'left' | 'right'>('right')
  const [redactEdges, setRedactEdges] = useState('keep')
  const [redactPattern, setRedactPattern] = useState('')
  const [tsMode, setTsMode] = useState<'toHuman' | 'toEpoch'>('toHuman')
  const [tsFormat, setTsFormat] = useState<TimestampFormat>('iso')
  const [tableFormat, setTableFormat] = useState<'markdown' | 'html'>('markdown')
  const [hashOut, setHashOut] = useState<{ result: string; error: string | null }>({ result: '', error: null })
  const [groupOpen, setGroupOpen] = useState(true)
  const toolsTool = useAppStore(s => s.toolsTool)
  const setToolsTool = useAppStore(s => s.setToolsTool)

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
      case 'redact': return redactJson(input, { keepEdges: redactEdges === 'keep', extraKeyPattern: redactPattern.trim() || undefined })
      case 'ts': return tsMode === 'toHuman' ? humanizeTimestamps(input, { format: tsFormat }) : toEpochTimestamps(input)
      case 'tableExport': return exportTable(input, tableFormat)
      case 'paths': return collectPaths(input)
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
    keyCaseStyle, content, mergeStrategy, mergePrefer, redactEdges, redactPattern, tsMode, tsFormat, tableFormat])

  const hitCount = result.hits?.length ?? 0

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
    || tool === 'keyCase' || tool === 'merge' || tool === 'redact' || tool === 'ts' || tool === 'tableExport'

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
                    placeholder="附加键名正则，如 uid|uuid"
                    value={redactPattern}
                    spellCheck={false}
                    onChange={e => setRedactPattern(e.target.value)}
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
