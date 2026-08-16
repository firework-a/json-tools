import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store'
import { jsonToSchema } from '../utils/jsonSchema'
import { jsonToYaml } from '../utils/jsonYaml'
import { jsonToXml, jsonToToml, jsonToCsv } from '../utils/jsonFormats'
import { validateJsonSchema } from '../utils/schemaValidator'
import { generateCode, CODE_LANGS, type CodeLang } from '../utils/codeGen'
import CodeEditor from './CodeEditor'
import ShikiPreview from './ShikiPreview'
import DiffEditor from './DiffEditor'
import { BackIcon, SchemaIcon, ChevronDown, WandIcon, ShieldCheckIcon } from './Icons'
import CopyButton from './CopyButton'
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

const previewLangFor = (mode: string, convertFormat: ConvertFormat, codeLang: CodeLang): string => {
  if (mode === 'ts') return CODE_LANGS.find(l => l.id === codeLang)?.shiki ?? 'typescript'
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
    codeLang, setCodeLang,
    codeRootName, setCodeRootName,
  } = useAppStore()
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const langMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!langMenuOpen) return
    const onDown = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [langMenuOpen])

  useEffect(() => {
    if (mode === 'edit' || mode === 'diff') return
    let cancelled = false
    const t = setTimeout(async () => {
      let r: { result: string; error: string | null }
      if (mode === 'ts') r = await generateCode(content, codeLang, codeRootName)
      else if (mode === 'schema') r = jsonToSchema(content)
      else r = convertToFormat(convertFormat, content)
      if (cancelled) return
      if (r.error && content.trim()) useAppStore.getState().showToast(r.error)
      else setRightContent(r.result)
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [content, mode, codeLang, codeRootName, convertFormat, setRightContent])

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
            <CopyButton getText={() => rightContent} title="复制右侧" />
          </div>
          <DiffEditor
            original={content}
            modified={rightContent}
            onOriginalChange={setContent}
            onModifiedChange={setRightContent}
          />
        </div>
      </div>
    )
  }

  const previewLang = previewLangFor(mode, convertFormat, codeLang)

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
                <CopyButton getText={() => rightContent} title="复制" />
              </>
            }
          >
            <ShikiPreview code={rightContent} lang={previewLang} />
          </EditorSide>
        </div>
      </div>
    )
  }

  if (mode === 'ts') {
    const activeMeta = CODE_LANGS.find(l => l.id === codeLang) ?? CODE_LANGS[0]
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
                <div className="lang-dropdown" ref={langMenuRef}>
                  <button className="pill active purple dd" onClick={() => setLangMenuOpen(v => !v)}>
                    {activeMeta.label} <ChevronDown size={10} />
                  </button>
                  {langMenuOpen && (
                    <div className="lang-menu">
                      {CODE_LANGS.map(l => (
                        <button key={l.id}
                          className={`lang-menu-item ${l.id === codeLang ? 'active' : ''}`}
                          onClick={() => { setCodeLang(l.id as CodeLang); setLangMenuOpen(false) }}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input className="name-input" value={codeRootName}
                  placeholder={activeMeta.rootLabel}
                  onChange={e => setCodeRootName(e.target.value)} spellCheck={false} />
                <CopyButton getText={() => rightContent} title="复制" />
              </>
            }
          >
            <ShikiPreview code={rightContent} lang={previewLang} />
          </EditorSide>
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
                <CopyButton getText={() => rightContent} title="复制" />
              </>
            }
          >
            <ShikiPreview code={rightContent} lang={previewLang} />
          </EditorSide>
        </div>
      </div>
    )
  }
  return null
}

export default EditorArea
