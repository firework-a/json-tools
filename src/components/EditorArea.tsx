import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store'
import { jsonToSchema } from '../utils/jsonSchema'
import { jsonToYaml, yamlToJson } from '../utils/jsonYaml'
import { jsonToXml, jsonToToml, jsonToCsv, xmlToJson, tomlToJson, csvToJson } from '../utils/jsonFormats'
import { validateJsonSchema } from '../utils/schemaValidator'
import { generateCode, CODE_LANGS, type CodeLang } from '../utils/codeGen'
import CodeEditor from './CodeEditor'
import ShikiPreview from './ShikiPreview'
import DiffEditor from './DiffEditor'
import GridView from './GridView'
import ToolsPanel from './ToolsPanel'
import { BackIcon, SchemaIcon, ChevronDown, WandIcon, ShieldCheckIcon } from './Icons'
import CopyButton from './CopyButton'
import type { ConvertFormat } from '../store'
import { compare } from 'fast-json-patch'
import { copyToClipboard } from '../utils/json'
import { applyJsonSchema } from '../monaco-setup'

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
    convertDirection, setConvertDirection,
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
    if (mode === 'edit' || mode === 'diff' || mode === 'tools') return
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
            <button
              className="action-btn gen"
              title="生成 JSON Patch (RFC 6902) 并复制"
              onClick={async () => {
                if (!content.trim() || !rightContent.trim()) {
                  useAppStore.getState().showToast('两侧都需要 JSON 内容')
                  return
                }
                try {
                  const patch = compare(JSON.parse(content), JSON.parse(rightContent))
                  if (patch.length === 0) {
                    useAppStore.getState().showToast('两侧内容一致，无差异')
                    return
                  }
                  const ok = await copyToClipboard(JSON.stringify(patch, null, 2))
                  useAppStore.getState().showToast(ok ? `已复制 JSON Patch（${patch.length} 处变更）` : '复制失败')
                } catch (e) {
                  useAppStore.getState().showToast('生成失败：' + (e instanceof Error ? e.message : String(e)))
                }
              }}
            >
              <WandIcon size={12} /> 生成 Patch
            </button>
            <button
              className="action-btn chk"
              title="从剪贴板读取 JSON Patch 应用到左侧文档"
              onClick={async () => {
                if (!content.trim()) {
                  useAppStore.getState().showToast('左侧需要 JSON 内容')
                  return
                }
                try {
                  const text = await navigator.clipboard.readText()
                  const patch = JSON.parse(text)
                  if (!Array.isArray(patch)) { useAppStore.getState().showToast('剪贴板内容不是 JSON Patch 数组'); return }
                  const { applyPatch } = await import('fast-json-patch')
                  const r = applyPatch(JSON.parse(content), patch)
                  setContent(JSON.stringify(r.newDocument, null, 2))
                  useAppStore.getState().showToast(`已应用 Patch（${patch.length} 处变更）`)
                } catch (e) {
                  useAppStore.getState().showToast('应用失败：' + (e instanceof Error ? e.message : String(e)))
                }
              }}
            >
              应用 Patch
            </button>
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

  // 反向转换（X → JSON）：输入变化自动重算（300ms 防抖）
  useEffect(() => {
    if (mode !== 'convert' || convertDirection !== 'toJson') return
    const reverseConvert = (f: ConvertFormat, input: string) => {
      if (f === 'yaml') return yamlToJson(input)
      if (f === 'xml') return xmlToJson(input)
      if (f === 'toml') return tomlToJson(input)
      return csvToJson(input)
    }
    const t = setTimeout(() => {
      if (!content.trim()) { setRightContent(''); return }
      const r = reverseConvert(convertFormat, content)
      if (r.error && content.trim()) useAppStore.getState().showToast(r.error)
      else setRightContent(r.result)
    }, 300)
    return () => clearTimeout(t)
  }, [content, mode, convertDirection, convertFormat])

  const previewLang = previewLangFor(mode, convertFormat, codeLang)

  if (mode === 'tools') {
    return <ToolsPanel />
  }

  if (mode === 'table') {
    return <GridView />
  }

  if (mode === 'convert') {
    const fmts: ConvertFormat[] = ['yaml', 'xml', 'toml', 'csv']
    const reverse = convertDirection === 'toJson'
    const reverseLangMap: Record<ConvertFormat, string> = { yaml: 'yaml', xml: 'xml', toml: 'toml', csv: 'text' }
    return (
      <div className="tool-shell">
        <div className="tool-pane-wrap">
          <EditorSide
            topbar={
              <>
                <button className="tool-back-flat" onClick={() => useAppStore.setState({ mode: 'edit' })} title="返回">
                  <BackIcon />
                </button>
                <div className="pill-group">
                  <button
                    className={`pill ${!reverse ? 'active blue' : ''}`}
                    title="JSON → 其他格式"
                    onClick={() => setConvertDirection('fromJson')}
                  >JSON → {convertFormat.toUpperCase()}</button>
                  <button
                    className={`pill ${reverse ? 'active blue' : ''}`}
                    title="其他格式 → JSON"
                    onClick={() => setConvertDirection('toJson')}
                  >{convertFormat.toUpperCase()} → JSON</button>
                </div>
              </>
            }
          >
            {reverse
              ? <CodeEditor value={content} onChange={setContent} language={reverseLangMap[convertFormat]} />
              : <CodeEditor value={content} onChange={setContent} language="json" />}
          </EditorSide>
          <EditorSide
            empty={!rightContent.trim()}
            topbar={
              <>
                {reverse ? (
                  <span className="pill pill-json">JSON</span>
                ) : (
                  <div className="pill-group">
                    {fmts.map(f => (
                      <button key={f} className={`pill ${convertFormat === f ? 'active blue' : ''}`}
                        onClick={() => {
                          setConvertFormat(f)
                          setRightContent(convertToFormat(f, content).result)
                        }}>{f.toUpperCase()}</button>
                    ))}
                  </div>
                )}
                <CopyButton getText={() => rightContent} title="复制" />
              </>
            }
          >
            {reverse
              ? <ShikiPreview code={rightContent} lang="json" />
              : <ShikiPreview code={rightContent} lang={previewLang} />}
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
                <button className="action-btn chk" title="把 Schema 应用到编辑器实时校验（编辑区实时标出不符合项）" onClick={() => {
                  if (!rightContent.trim()) {
                    useAppStore.getState().showToast('请先生成 Schema')
                    return
                  }
                  try {
                    applyJsonSchema(JSON.parse(rightContent))
                    useAppStore.getState().showToast('Schema 已应用到编辑器校验')
                  } catch {
                    useAppStore.getState().showToast('Schema 不是合法 JSON')
                  }
                }}>
                  应用校验
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
