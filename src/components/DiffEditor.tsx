import { useRef, useEffect } from 'react'
import { DiffEditor as MonacoDiffEditor, type DiffOnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { useAppStore } from '../store'
import '../monaco-setup'

interface Props {
  original: string
  modified: string
  onOriginalChange?: (v: string) => void
  onModifiedChange?: (v: string) => void
}

export default function DiffEditor({ original, modified, onOriginalChange, onModifiedChange }: Props) {
  const theme = useAppStore(s => s.theme)
  const showLineNumbers = useAppStore(s => s.showLineNumbers)
  const wordWrap = useAppStore(s => s.wordWrap)
  const fontSize = useAppStore(s => s.fontSize)
  const syncing = useRef(false)
  const editorRef = useRef<Monaco.editor.IStandaloneDiffEditor | null>(null)

  // 设置页切换自动换行/字号/行号时同步到两侧编辑器
  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    const w = wordWrap ? 'on' : 'off'
    ed.getOriginalEditor().updateOptions({ wordWrap: w })
    ed.getModifiedEditor().updateOptions({ wordWrap: w })
  }, [wordWrap])

  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    ed.getOriginalEditor().updateOptions({ fontSize: fontSize })
    ed.getModifiedEditor().updateOptions({ fontSize: fontSize })
  }, [fontSize])

  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    const ln = showLineNumbers ? 'on' : 'off'
    ed.getOriginalEditor().updateOptions({ lineNumbers: ln })
    ed.getModifiedEditor().updateOptions({ lineNumbers: ln })
  }, [showLineNumbers])

  const onMount: DiffOnMount = (editor) => {
    editorRef.current = editor
    editor.updateOptions({
      renderSideBySide: true,
      readOnly: false,
      originalEditable: true,
    } as Monaco.editor.IDiffEditorOptions)

    const origEditor = editor.getOriginalEditor()
    const modEditor = editor.getModifiedEditor()
    ;[origEditor, modEditor].forEach(e => e.updateOptions({ tabSize: 2 }))

    // 粘贴大段内容后把视图对齐到粘贴内容起始处，避免 Monaco 默认 reveal 到末尾滚到底
    ;[origEditor, modEditor].forEach((e) => {
      e.onDidPaste((ev) => {
        const start = { lineNumber: ev.range.startLineNumber, column: ev.range.startColumn }
        let cancelled = false
        const cancel = () => { cancelled = true }
        const domNode = e.getDomNode()
        domNode?.addEventListener('wheel', cancel, { once: true, passive: true })
        domNode?.addEventListener('mousedown', cancel, { once: true })
        const restore = () => {
          if (cancelled) return
          e.setPosition(start)
          e.revealPositionNearTop(start)
        }
        restore()
        requestAnimationFrame(restore)
        requestAnimationFrame(() => requestAnimationFrame(restore))
        setTimeout(() => {
          restore()
          domNode?.removeEventListener('wheel', cancel)
          domNode?.removeEventListener('mousedown', cancel)
        }, 200)
      })
    })
    const origModel = origEditor.getModel()
    const modModel = modEditor.getModel()
    origModel?.onDidChangeContent(() => {
      if (syncing.current) return
      syncing.current = true
      onOriginalChange?.(origModel.getValue())
      requestAnimationFrame(() => { syncing.current = false })
    })
    modModel?.onDidChangeContent(() => {
      if (syncing.current) return
      syncing.current = true
      onModifiedChange?.(modModel.getValue())
      requestAnimationFrame(() => { syncing.current = false })
    })
  }

  // 卸载时先把 diff 模型重置为 null 再由 @monaco-editor/react dispose，
  // 避免 "TextModel got disposed before DiffEditorWidget model got reset"（切走 diff 模式时报错）
  useEffect(() => () => {
    const ed = editorRef.current
    if (ed) {
      try { ed.setModel(null) } catch { /* ignore */ }
      editorRef.current = null
    }
  }, [])

  return (
    <MonacoDiffEditor
      original={original}
      modified={modified}
      onMount={onMount}
      theme={theme === 'dark' ? 'app-dark' : 'app-light'}
      language="json"
      loading={<div className="editor-loading" />}
      options={{
        automaticLayout: true,
        readOnly: false,
        originalEditable: true,
        renderSideBySide: true,
        minimap: { enabled: false },
        fontSize,
        fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, Menlo, monospace",
        fontLigatures: true,
        lineNumbers: showLineNumbers ? 'on' : 'off',
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        renderLineHighlight: 'line',
        wordWrap: wordWrap ? 'on' : 'off',
        folding: true,
        padding: { top: 8, bottom: 12 },
        scrollbar: {
          verticalScrollbarSize: 12,
          horizontalScrollbarSize: 12,
          alwaysConsumeMouseWheel: false,
        },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        renderOverviewRuler: false,
      } as Monaco.editor.IDiffEditorOptions}
    />
  )
}
