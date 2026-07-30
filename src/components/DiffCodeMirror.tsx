import { useRef, useEffect } from 'react'
import CodeMirror, { ReactCodeMirrorProps } from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode'
import { useAppStore } from '../store'
import { EditorView, Decoration } from '@codemirror/view'
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state'

export interface DiffCodeMirrorProps extends Omit<ReactCodeMirrorProps, 'extensions'> {
  addedLines?: Set<number>
  removedLines?: Set<number>
  lang?: 'json' | 'text' | 'yaml' | 'ts'
}

const hlEffect = StateEffect.define<{ added?: Set<number>; removed?: Set<number> }>()

const hlField = StateField.define<{ added: Set<number>; removed: Set<number> }>({
  create: () => ({ added: new Set(), removed: new Set() }),
  update(v, tr) {
    for (const e of tr.effects) {
      if (e.is(hlEffect)) {
        return { added: e.value.added ?? new Set(), removed: e.value.removed ?? new Set() }
      }
    }
    return v
  },
})

const hlDecor = EditorView.decorations.of((view) => {
  const hl = view.state.field(hlField, false)
  if (!hl || (hl.added.size === 0 && hl.removed.size === 0)) return Decoration.none
  const b = new RangeSetBuilder<Decoration>()
  const lines = view.state.doc.lines
  for (let i = 1; i <= lines; i++) {
    const pos = view.state.doc.line(i).from
    if (hl.added.has(i)) {
      b.add(pos, pos, Decoration.line({ class: 'cm-diff-added' }))
    } else if (hl.removed.has(i)) {
      b.add(pos, pos, Decoration.line({ class: 'cm-diff-removed' }))
    }
  }
  return b.finish()
})

export default function DiffCodeMirror({
  addedLines,
  removedLines,
  lang = 'json',
  value,
  ...rest
}: DiffCodeMirrorProps) {
  const theme = useAppStore(s => s.theme)
  const viewRef = useRef<EditorView | null>(null)
  const extensions = [EditorView.lineWrapping, hlField, hlDecor]
  if (lang === 'json') extensions.unshift(json())

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: hlEffect.of({ added: addedLines, removed: removedLines }),
      })
    }
  }, [addedLines, removedLines])

  return (
    <CodeMirror
      value={value}
      extensions={extensions}
      theme={theme === 'dark' ? vscodeDark : vscodeLight}
      style={{ height: '100%' }}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: false }}
      onCreateEditor={(view) => { viewRef.current = view }}
      {...rest}
    />
  )
}
