import { useEffect } from 'react'
import { useAppStore } from '../store'
import { jsonToTs } from '../utils/jsonToTs'
import { jsonToSchema } from '../utils/jsonSchema'
import { jsonToYaml, yamlToJson } from '../utils/jsonYaml'
import { jsonToXml, xmlToJson, jsonToToml, tomlToJson, jsonToCsv, csvToJson } from '../utils/jsonFormats'
import { validateJsonSchema } from '../utils/schemaValidator'
import CodeEditor from './CodeEditor'
import ShikiPreview from './ShikiPreview'
import DiffEditor from './DiffEditor'
import { BackIcon, CopyIcon, SchemaIcon, ChevronDown, WandIcon, ShieldCheckIcon, ArrowRight, ArrowsLeftRight } from './Icons'
import { copyToClipboard } from '../utils/json'
import type { ConvertFormat } from '../store'

// 单侧面板（含顶部条）
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

const previewLangFor = (mode: string, convertFormat: ConvertFormat): string => {
  if (mode === 'ts') return 'typescript'
  if (mode === 'schema') return 'json'
  if (mode === 'convert') return convertFormat === 'csv' ? 'text' : convertFormat
  return 'json'
}

function EditorArea() {
  const {
    content, setContent,
    rightContent, setRightContent,
    mode,
    convertFormat, setConvertFormat,
    tsInterfaceName, setTsInterfaceName,
  } = useAppStore()

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
          <CodeEditor value={content} onChange={setContent} language="json" />
        </div>
      </div>
    )
  }

  // diff：Monaco 自带 DiffEditor
  if (mode === 'diff') {
    return (
      <div className="tool-shell">
        <div className="tool-pane-wrap diff-wrap">
          <div className="pane-topbar diff-topbar">
            <button className="tool-back-flat" onClick={() => useAppStore.setState({ mode: 'edit' })} title="返回">
              <BackIcon />
            </button>
            <div className="diff-topbar-titles">
              <span className="pill pill-json">左侧 (original)</span>
              <span className="pill pill-json">右侧 (modified)</span>
            </div>
            <button className="tool-copy-flat" onClick={() => copyToClipboard(rightContent)} title="复制右侧">
              <CopyIcon />
            </button>
          </div>
          <DiffEditor
            original={content}
            modified={rightContent}
            onOriginalChange={setContent}
            onModifiedChange={setRightContent}
          />
          <button className="tool-fab blue circle" onClick={() => {
            const t = content; setContent(rightContent); setRightContent(t)
          }} title="交换">
            <ArrowsLeftRight size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    )
  }

  const previewLang = previewLangFor(mode, convertFormat)

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
            <CodeEditor value={content} onChange={setContent} language="json" />
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
            <ShikiPreview code={rightContent} lang={previewLang} />
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
            <CodeEditor value={content} onChange={setContent} language="json" />
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
            <ShikiPreview code={rightContent} lang={previewLang} />
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
            <CodeEditor value={content} onChange={setContent} language="json" />
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
            <ShikiPreview code={rightContent} lang={previewLang} />
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
