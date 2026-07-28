import { useEffect, useRef, useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { EditorView, Decoration } from '@codemirror/view'
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state'

interface DiffEditorProps {
  value: string
  onChange?: (value: string) => void
  editable?: boolean
  className?: string
  diffLines?: {
    added?: Set<number>
    deleted?: Set<number>
  }
  editorId?: string
}

const highlightEffect = StateEffect.define<{
  added?: Set<number>
  deleted?: Set<number>
}>()

const highlightField = StateField.define<{
  added: Set<number>
  deleted: Set<number>
}>({
  create() {
    return { added: new Set(), deleted: new Set() }
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(highlightEffect)) {
        return {
          added: effect.value.added ?? new Set(),
          deleted: effect.value.deleted ?? new Set(),
        }
      }
    }
    return value
  },
})

// 用一个独立的 provide 函数直接从 state field + doc 构造装饰
const diffDecorations = EditorView.decorations.of((view) => {
  const highlights = view.state.field(highlightField, false)
  if (!highlights || (highlights.added.size === 0 && highlights.deleted.size === 0)) {
    return Decoration.none
  }
  const builder = new RangeSetBuilder<Decoration>()
  const lineCount = view.state.doc.lines
  for (let lineNo = 1; lineNo <= lineCount; lineNo++) {
    const linePos = view.state.doc.line(lineNo)
    if (highlights.added.has(lineNo)) {
      builder.add(linePos.from, linePos.from, Decoration.line({ class: 'cm-diff-added' }))
    } else if (highlights.deleted.has(lineNo)) {
      builder.add(linePos.from, linePos.from, Decoration.line({ class: 'cm-diff-deleted' }))
    }
  }
  return builder.finish()
})

// 全局滚动同步
class ScrollSyncManager {
  private editors = new Map<string, HTMLElement>()
  private syncingFrom: string | null = null

  register(id: string, el: HTMLElement) {
    this.editors.set(id, el)
  }
  unregister(id: string) {
    this.editors.delete(id)
  }
  sync(sourceId: string, scrollTop: number) {
    if (this.syncingFrom === sourceId) return
    this.syncingFrom = sourceId
    this.editors.forEach((el, id) => {
      if (id !== sourceId) el.scrollTop = scrollTop
    })
    requestAnimationFrame(() => {
      if (this.syncingFrom === sourceId) this.syncingFrom = null
    })
  }
}
const scrollSync = new ScrollSyncManager()

function DiffEditor({
  value,
  onChange,
  editable = true,
  className,
  diffLines = { added: new Set(), deleted: new Set() },
  editorId,
}: DiffEditorProps) {
  const viewRef = useRef<EditorView | null>(null)
  const scrollerRef = useRef<HTMLElement | null>(null)

  const handleScroll = useCallback(() => {
    if (scrollerRef.current && editorId) {
      scrollSync.sync(editorId, scrollerRef.current.scrollTop)
    }
  }, [editorId])

  const extensions = [json(), highlightField, diffDecorations]

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: highlightEffect.of({
          added: diffLines.added,
          deleted: diffLines.deleted,
        }),
      })
    }
  }, [diffLines])

  useEffect(() => {
    if (editorId && scrollerRef.current) {
      scrollSync.register(editorId, scrollerRef.current)
      scrollerRef.current.addEventListener('scroll', handleScroll, { passive: true })
      return () => {
        scrollerRef.current?.removeEventListener('scroll', handleScroll)
        scrollSync.unregister(editorId)
      }
    }
  }, [editorId, handleScroll])

  return (
    <div className={`json-editor ${className || ''}`}>
      <CodeMirror
        value={value}
        extensions={extensions}
        theme={vscodeDark}
        onChange={onChange}
        editable={editable}
        style={{ height: '100%' }}
        basicSetup={{ lineNumbers: true, foldGutter: true }}
        onCreateEditor={(view) => {
          viewRef.current = view
          scrollerRef.current = view.scrollDOM
        }}
      />
    </div>
  )
}

export default DiffEditor
