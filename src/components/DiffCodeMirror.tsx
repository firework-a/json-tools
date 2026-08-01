import { useRef, useEffect } from 'react'
import CodeMirror, { ReactCodeMirrorProps } from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode'
import { useAppStore } from '../store'
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view'
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state'
import { foldGutter } from '@codemirror/language'
import { editorRegistration } from '../editorRegistry'

export interface DiffCodeMirrorProps extends Omit<ReactCodeMirrorProps, 'extensions'> {
  addedLines?: Set<number>
  removedLines?: Set<number>
  lang?: 'json' | 'text' | 'yaml' | 'ts'
  /** 另一个编辑器的 ref, 用于双向同步滚动 */
  peerRef?: React.MutableRefObject<EditorView | null>
  /** 外部传入的 view ref, 用于父组件拿到实例 */
  viewRef?: React.MutableRefObject<EditorView | null>
}

const hlEffect = StateEffect.define<DecorationSet>()

const hlField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(v, tr) {
    for (const e of tr.effects) {
      if (e.is(hlEffect)) v = e.value
    }
    return v
  },
  provide: (f) => EditorView.decorations.from(f),
})

function buildHighlight(view: EditorView, added?: Set<number>, removed?: Set<number>): DecorationSet {
  if (!added && !removed) return Decoration.none
  const b = new RangeSetBuilder<Decoration>()
  const lines = view.state.doc.lines
  for (let i = 1; i <= lines; i++) {
    const pos = view.state.doc.line(i).from
    if (added?.has(i)) {
      b.add(pos, pos, Decoration.line({ class: 'cm-diff-added' }))
    } else if (removed?.has(i)) {
      b.add(pos, pos, Decoration.line({ class: 'cm-diff-removed' }))
    }
  }
  return b.finish()
}

export default function DiffCodeMirror({
  addedLines,
  removedLines,
  lang = 'json',
  value,
  peerRef,
  viewRef: externalViewRef,
  ...rest
}: DiffCodeMirrorProps) {
  const theme = useAppStore(s => s.theme)
  const showLineNumbers = useAppStore(s => s.showLineNumbers)
  const viewRef = useRef<EditorView | null>(null)
  // 防止程序化滚动触发对方滚动, 造成回环
  const syncingRef = useRef(false)

  const scrollSyncExt = EditorView.domEventHandlers({
    scroll() {
      if (syncingRef.current) return
      const self = viewRef.current
      const peer = peerRef?.current
      if (!self || !peer) return
      const selfDOM = self.scrollDOM
      const peerDOM = peer.scrollDOM
      const selfMax = selfDOM.scrollHeight - selfDOM.clientHeight
      const peerMax = peerDOM.scrollHeight - peerDOM.clientHeight
      if (selfMax <= 0 || peerMax <= 0) return
      const ratio = selfDOM.scrollTop / selfMax
      syncingRef.current = true
      peerDOM.scrollTop = ratio * peerMax
      peerDOM.scrollLeft = selfDOM.scrollLeft
      requestAnimationFrame(() => { syncingRef.current = false })
    },
  })

  const extensions = [
    EditorView.lineWrapping,
    scrollSyncExt,
    editorRegistration,
    foldGutter({
      markerDOM: (open: boolean) => {
        const el = document.createElement('span')
        el.className = 'cm-fold-marker'
        el.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${open ? 90 : 0}deg); transition: transform .12s; color: var(--fold-arrow, #5a6170);"><path d="m9 18 6-6-6-6"/></svg>`
        return el
      },
    }),
    hlField,
  ]
  if (lang === 'json') extensions.unshift(json())

  // 当高亮集合或编辑器实例变化时重新计算并派发装饰
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: hlEffect.of(buildHighlight(view, addedLines, removedLines)),
    })
  }, [addedLines, removedLines, value])

  return (
    <CodeMirror
      value={value}
      extensions={extensions}
      theme={theme === 'dark' ? vscodeDark : vscodeLight}
      style={{ height: '100%' }}
      basicSetup={{ lineNumbers: showLineNumbers, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: true }}
      onCreateEditor={(view) => {
        viewRef.current = view
        if (externalViewRef) externalViewRef.current = view
      }}
      {...rest}
    />
  )
}
