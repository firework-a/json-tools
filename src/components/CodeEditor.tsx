import { useRef, useEffect, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { useAppStore } from '../store'
import { registerMainEditor } from '../editorRegistry'
import '../monaco-setup'

interface Props {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  /** 语言 id（json / yaml / typescript / xml / toml / plaintext） */
  language?: string
}

export default function CodeEditor({ value, onChange, readOnly, language }: Props) {
  const theme = useAppStore(s => s.theme)
  const showLineNumbers = useAppStore(s => s.showLineNumbers)
  const autoFormat = useAppStore(s => s.autoFormat)
  const storeLanguage = useAppStore(s => s.editorLanguage)
  const fontSize = useAppStore(s => s.fontSize)
  const tabSize = useAppStore(s => s.tabSize)
  const wordWrap = useAppStore(s => s.wordWrap)
  const renderIndentGuides = useAppStore(s => s.renderIndentGuides)
  const minimap = useAppStore(s => s.minimap)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const unregisterRef = useRef<(() => void) | null>(null)

  // 显式传入的 language 优先（如 diff/convert 里指定 yaml 等），否则跟随当前标签语言
  const resolvedLanguage = language ?? storeLanguage
  // Monaco 在空 model 上初始化折叠控制器后，首次填入内容不会重算折叠范围，
  // 表现为粘贴后折叠箭头不出现（切模式重挂才好）。
  // 这里在内容首次从空变非空时用 key 强制重挂一次，让折叠控制器在非空 model 上初始化。
  const [remountKey, setRemountKey] = useState(0)
  const hasBumpedRef = useRef(false)

  useEffect(() => {
    if (hasBumpedRef.current) return
    if (value.length > 0) {
      hasBumpedRef.current = true
      setRemountKey(k => k + 1)
    }
  }, [value])

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    unregisterRef.current = registerMainEditor(editor)

    // 粘贴时自动格式化单行压缩 JSON（与旧逻辑一致）
    editor.onDidPaste((e) => {
      if (!autoFormat || resolvedLanguage !== 'json' || readOnly) return
      const text = editor.getModel()?.getValueInRange(e.range) ?? ''
      const trimmed = text.trim()
      const looksLikeJson = /^[[{]/.test(trimmed) && /[}\]]$/.test(trimmed)
      if (!looksLikeJson || trimmed.includes('\n')) return
      try {
        const formatted = JSON.stringify(JSON.parse(trimmed), null, 2)
        const op = { range: e.range, text: formatted, forceMoveMarkers: true }
        editor.executeEdits('paste-format', [op])
      } catch {
        /* keep original */
      }
    })

    void monaco
  }

  useEffect(() => () => {
    editorRef.current = null
    unregisterRef.current?.()
  }, [])

  return (
    <Editor
      key={remountKey}
      value={value}
      onChange={(v) => onChange?.(v ?? '')}
      onMount={onMount}
      theme={theme === 'dark' ? 'app-dark' : 'app-light'}
      language={resolvedLanguage}
      loading={<div className="editor-loading" />}
      options={{
        readOnly,
        automaticLayout: true,
        minimap: { enabled: minimap },
        fontSize,
        fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, Menlo, monospace",
        fontLigatures: true,
        lineNumbers: showLineNumbers ? 'on' : 'off',
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        renderLineHighlight: 'line',
        renderWhitespace: 'none',
        bracketPairColorization: { enabled: true },
        guides: { indentation: renderIndentGuides, bracketPairs: false },
        folding: true,
        foldingStrategy: 'indentation',
        foldingHighlight: false,
        wordWrap: wordWrap ? 'on' : 'off',
        tabSize,
        padding: { top: 8, bottom: 12 },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
          alwaysConsumeMouseWheel: false,
        },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
      }}
    />
  )
}
