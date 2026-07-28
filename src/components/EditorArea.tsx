import { useEffect, useRef, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { EditorView } from '@codemirror/view'
import { useAppStore } from '../store'
import { jsonToTs } from '../utils/jsonToTs'
import { jsonToSchema } from '../utils/jsonSchema'
import { jsonToYaml, yamlToJson } from '../utils/jsonYaml'
import { computeDiff } from '../utils/jsonDiffer'
import DiffCodeMirror from './DiffCodeMirror'
import { BackIcon, CopyIcon, SchemaIcon, ChevronDown, WandIcon, ShieldCheckIcon, ArrowRight, ArrowsLeftRight } from './Icons'
import { copyToClipboard } from '../utils/json'
import type { ConvertFormat } from '../store'

interface PaneProps {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
}
function PlainPane({ value, onChange, readOnly }: PaneProps) {
  return (
    <CodeMirror
      value={value}
      extensions={[EditorView.lineWrapping, json()]}
      theme={vscodeDark}
      onChange={onChange}
      editable={!readOnly}
      style={{ height: '100%' }}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: false }}
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

function EditorArea() {
  const {
    content, setContent,
    rightContent, setRightContent,
    mode,
    convertFormat, setConvertFormat,
    tsInterfaceName, setTsInterfaceName,
  } = useAppStore()

  const diff = useMemo(() => mode === 'diff' ? computeDiff(content, rightContent) : null, [mode, content, rightContent])

  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    const t = setTimeout(() => {
      if (mode === 'ts') setRightContent(jsonToTs(content, { rootName: tsInterfaceName }).result)
      else if (mode === 'schema') setRightContent(jsonToSchema(content).result)
      else if (mode === 'convert' && convertFormat === 'yaml') setRightContent(jsonToYaml(content).result)
    }, 300)
    return () => clearTimeout(t)
  }, [content, mode, tsInterfaceName, convertFormat])

  if (mode === 'edit') {
    return (
      <div className="editor-shell single">
        <div className="pane-full">
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
                        if (f === 'yaml') setRightContent(jsonToYaml(content).result)
                        else setRightContent(`// ${f.toUpperCase()} 转换暂未实现`)
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
            if (convertFormat === 'yaml') {
              const r = yamlToJson(rightContent)
              if (r.result) setContent(r.result)
            }
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
                <button className="action-btn chk">
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
