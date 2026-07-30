import { useEffect, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode'
import { EditorView } from '@codemirror/view'
import { foldGutter } from '@codemirror/language'
import { useAppStore } from '../store'
import { formatJson } from '../utils/json'
import { jsonToTs } from '../utils/jsonToTs'
import { jsonToSchema } from '../utils/jsonSchema'
import { jsonToYaml, yamlToJson } from '../utils/jsonYaml'
import { jsonToXml, xmlToJson, jsonToToml, tomlToJson, jsonToCsv, csvToJson } from '../utils/jsonFormats'
import { validateJsonSchema } from '../utils/schemaValidator'
import { computeDiff } from '../utils/jsonDiffer'
import DiffCodeMirror from './DiffCodeMirror'
import { BackIcon, CopyIcon, SchemaIcon, ChevronDown, WandIcon, ShieldCheckIcon, ArrowRight, ArrowsLeftRight } from './Icons'
import { copyToClipboard } from '../utils/json'
import type { ConvertFormat } from '../store'

// Lucide chevron-right SVG marker for CodeMirror fold gutter
const foldMarker = (open: boolean) => {
  const el = document.createElement('span')
  el.className = 'cm-fold-marker'
  el.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${open ? 90 : 0}deg); transition: transform .12s; color: var(--fold-arrow, #5a6170);"><path d="m9 18 6-6-6-6"/></svg>`
  return el
}

// Paste handler: auto-format minified JSON on paste by dispatching to view
const pasteFormatExt = EditorView.domEventHandlers({
  paste(event, view) {
    if (!useAppStore.getState().autoFormat) return false
    const text = event.clipboardData?.getData('text/plain')
    if (!text) return false
    const trimmed = text.trim()
    const looksLikeJson = /^[[{]/.test(trimmed) && /[}\]]$/.test(trimmed)
    if (!looksLikeJson || trimmed.includes('\n')) return false
    const { result } = formatJson(text)
    if (!result) return false
    event.preventDefault()
    const { from, to } = view.state.selection.main
    view.dispatch({
      changes: { from, to, insert: result },
      selection: { anchor: from + result.length },
      scrollIntoView: true,
    })
    return true
  },
})

interface PaneProps {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
}
function PlainPane({ value, onChange, readOnly }: PaneProps) {
  const theme = useAppStore(s => s.theme)
  const showLineNumbers = useAppStore(s => s.showLineNumbers)
  return (
    <CodeMirror
      value={value}
      extensions={[EditorView.lineWrapping, json(), foldGutter({
        markerDOM: (open: boolean) => foldMarker(open),
        openText: '点击收起',
        closedText: '点击展开',
      }), pasteFormatExt]}
      theme={theme === 'dark' ? vscodeDark : vscodeLight}
      onChange={onChange}
      editable={!readOnly}
      style={{ height: '100%' }}
      basicSetup={{ lineNumbers: showLineNumbers, foldGutter: false, highlightActiveLine: false }}
    />
  )
}

// 单侧编辑面板（含顶部条）
interface EditorSideProps {
  topbar: React.ReactNode
  children: React.ReactNode
  empty?: boolean
}
function EditorSide({ topbar, children, empty }: EditorSideProps) {
  return (
    <div className={`tool-pane ${empty ? 'is-empty' : ''}`}>
      <div className="pane-topbar">{topbar}</div>
      <div className="tool-pane-body">{children}</div>
    </div>
  )
}

const convertToFormat = (format: ConvertFormat, input: string) => {
  if (format === 'yaml') return jsonToYaml(input)
  if (format === 'xml') return jsonToXml(input)
  if (format === 'toml') return jsonToToml(input)
  return jsonToCsv(input)
}

const convertFromFormat = (format: ConvertFormat, input: string) => {
  if (format === 'yaml') return yamlToJson(input)
  if (format === 'xml') return xmlToJson(input)
  if (format === 'toml') return tomlToJson(input)
  return csvToJson(input)
}

function EditorArea() {
  const {
    content, setContent,
    rightContent, setRightContent,
    mode,
    convertFormat, setConvertFormat,
    tsInterfaceName, setTsInterfaceName,
  } = useAppStore()

  const diff = useMemo(() => mode === 'diff' ? computeDiff(content, rightContent) : null, [mode, content, rightContent])

  useEffect(() => {
    if (mode === 'edit' || mode === 'diff') return
    const t = setTimeout(() => {
      let r: { result: string; error: string | null }
      if (mode === 'ts') r = jsonToTs(content, { rootName: tsInterfaceName })
      else if (mode === 'schema') r = jsonToSchema(content)
      else r = convertToFormat(convertFormat, content)
      if (r.error && content.trim()) useAppStore.getState().showToast(r.error)
      else setRightContent(r.result)
    }, 300)
    return () => clearTimeout(t)
  }, [content, mode, tsInterfaceName, convertFormat, setRightContent])

  if (mode === 'edit') {
    return (
      <div className="editor-shell single">
        <div className="pane-full" id="editor-export-target">
          <PlainPane value={content} onChange={setContent} />
        </div>
      </div>
    )
  }

  // diff
  if (mode === 'diff' && diff) {
    const count = diff.left.size + diff.right.size
    return (
      <div className="tool-shell">
        <div className="tool-pane-wrap">
          <EditorSide
            topbar={
              <button className="tool-back-flat" onClick={() => useAppStore.setState({ mode: 'edit' })} title="返回">
                <BackIcon />
              </button>
            }
          >
            <DiffCodeMirror value={content} onChange={setContent} removedLines={diff.leftRemoved} />
          </EditorSide>
          <EditorSide
            empty={!rightContent.trim()}
            topbar={
              <button className="tool-copy-flat" onClick={() => copyToClipboard(rightContent)} title="复制">
                <CopyIcon />
              </button>
            }
          >
            <DiffCodeMirror value={rightContent} onChange={setRightContent} addedLines={diff.rightAdded} />
            {!rightContent.trim() && <div className="tool-pane-stripes" />}
          </EditorSide>
          {count > 0 && <div className="diff-stat">差异 <strong>{count}</strong> 行</div>}
          <button className="tool-fab blue circle" onClick={() => {
            const t = content; setContent(rightContent); setRightContent(t)
          }} title="交换">
            <ArrowsLeftRight size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'convert') {
    const fmts: ConvertFormat[] = ['yaml', 'xml', 'toml', 'csv']
    return (
      <div className="tool-shell">
        <div className="tool-pane-wrap">
          <EditorSide
            topbar={
              <>
                <button className="tool-back-flat" onClick={() => useAppStore.setState({ mode: 'edit' })} title="返回">
                  <BackIcon />
                </button>
                <span className="pill pill-json">JSON</span>
              </>
            }
          >
            <PlainPane value={content} onChange={setContent} />
          </EditorSide>
          <EditorSide
            empty={!rightContent.trim()}
            topbar={
              <>
                <div className="pill-group">
                  {fmts.map(f => (
                    <button key={f} className={`pill ${convertFormat === f ? 'active blue' : ''}`}
                      onClick={() => {
                        setConvertFormat(f)
                        setRightContent(convertToFormat(f, content).result)
                      }}>{f.toUpperCase()}</button>
                  ))}
                </div>
                <button className="tool-copy-flat" onClick={() => copyToClipboard(rightContent)} title="复制">
                  <CopyIcon />
                </button>
              </>
            }
          >
            <PlainPane value={rightContent} readOnly />
          </EditorSide>
          <button className="tool-fab blue circle" onClick={() => {
            const r = convertFromFormat(convertFormat, rightContent)
            if (r.error) useAppStore.getState().showToast(r.error)
            else setContent(r.result)
          }} title="反向转换">
            <ArrowsLeftRight size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'ts') {
    return (
      <div className="tool-shell">
        <div className="tool-pane-wrap">
          <EditorSide
            topbar={
              <>
                <button className="tool-back-flat" onClick={() => useAppStore.setState({ mode: 'edit' })} title="返回">
                  <BackIcon />
                </button>
                <span className="pill pill-json">JSON</span>
              </>
            }
          >
            <PlainPane value={content} onChange={setContent} />
          </EditorSide>
          <EditorSide
            topbar={
              <>
                <button className="pill active purple dd">TypeScript <ChevronDown size={10} /></button>
                <input className="name-input" value={tsInterfaceName}
                  onChange={e => setTsInterfaceName(e.target.value)} spellCheck={false} />
                <button className="tool-copy-flat" onClick={() => copyToClipboard(rightContent)} title="复制">
                  <CopyIcon />
                </button>
              </>
            }
          >
            <PlainPane value={rightContent} readOnly />
          </EditorSide>
          <button className="tool-fab purple circle" onClick={() => setRightContent(jsonToTs(content, { rootName: tsInterfaceName }).result)} title="重新生成">
            <ArrowsLeftRight size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'schema') {
    return (
      <div className="tool-shell">
        <div className="tool-pane-wrap">
          <EditorSide
            topbar={
              <>
                <button className="tool-back-flat" onClick={() => useAppStore.setState({ mode: 'edit' })} title="返回">
                  <BackIcon />
                </button>
                <span className="pill pill-json">JSON</span>
              </>
            }
          >
            <PlainPane value={content} onChange={setContent} />
          </EditorSide>
          <EditorSide
            topbar={
              <>
                <span className="pill pill-purple"><SchemaIcon size={12} color="#b578f0" /> JSON Schema</span>
                <button className="action-btn gen" onClick={() => setRightContent(jsonToSchema(content).result)}>
                  <WandIcon size={12} /> 生成
                </button>
                <button className="action-btn chk" onClick={() => {
                  if (!rightContent.trim()) {
                    useAppStore.getState().showToast('请先生成 Schema')
                    return
                  }
                  const validation = validateJsonSchema(content, rightContent)
                  useAppStore.getState().showToast(validation.valid ? 'JSON 符合当前 Schema' : validation.errors.join('；'))
                }}>
                  <ShieldCheckIcon size={12} /> 校验
                </button>
                <button className="tool-copy-flat" onClick={() => copyToClipboard(rightContent)} title="复制">
                  <CopyIcon />
                </button>
              </>
            }
          >
            <PlainPane value={rightContent} readOnly />
          </EditorSide>
          <button className="tool-fab yellow circle" onClick={() => setRightContent(jsonToSchema(content).result)} title="生成">
            <ArrowRight size={16} strokeWidth={2.6} />
          </button>
        </div>
      </div>
    )
  }
  return null
}

export default EditorArea
