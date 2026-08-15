import { useRef } from 'react'
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
  const syncing = useRef(false)

  const onMount: DiffOnMount = (editor) => {
    editor.updateOptions({
      renderSideBySide: true,
      readOnly: false,
      originalEditable: true,
    } as Monaco.editor.IDiffEditorOptions)

    const origEditor = editor.getOriginalEditor()
    const modEditor = editor.getModifiedEditor()
    ;[origEditor, modEditor].forEach(e => e.updateOptions({ tabSize: 2 }))
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
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, Menlo, monospace",
        fontLigatures: true,
        lineNumbers: showLineNumbers ? 'on' : 'off',
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        renderLineHighlight: 'line',
        wordWrap: 'on',
        folding: true,
        padding: { top: 8, bottom: 12 },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
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
