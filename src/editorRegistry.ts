import type * as Monaco from 'monaco-editor'

/**
 * 当前挂载的主编辑器实例。工具栏的折叠/展开、树形视图滚动联动
 * 都需要跨组件拿到 editor，用模块级注册表统一管理。
 */
let mainEditor: Monaco.editor.IStandaloneCodeEditor | null = null
let unregisterMain: (() => void) | null = null

const extraEditors = new Set<Monaco.editor.IStandaloneCodeEditor>()
const scrollListeners = new Set<(ratio: number, scrollTop: number) => void>()

/** 注册主编辑器（编辑区当前标签的编辑器），返回注销函数 */
export const registerMainEditor = (editor: Monaco.editor.IStandaloneCodeEditor) => {
  if (mainEditor && mainEditor !== editor) {
    unregisterMain?.()
  }
  mainEditor = editor
  const disposable = editor.onDidScrollChange((e) => {
    const el = editor.getDomNode()?.querySelector('.overflow-guard') as HTMLElement | null
    const max = el ? el.scrollHeight - el.clientHeight : 1
    const ratio = max > 0 ? e.scrollTop / max : 0
    scrollListeners.forEach(fn => fn(ratio, e.scrollTop))
  })
  unregisterMain = () => {
    disposable.dispose()
    if (mainEditor === editor) mainEditor = null
    unregisterMain = null
  }
  return unregisterMain
}

/** 注册一个非主编辑器实例（DiffEditor 子编辑器等），仅用于折叠/展开 */
export const registerEditor = (editor: Monaco.editor.IStandaloneCodeEditor) => {
  extraEditors.add(editor)
  return () => { extraEditors.delete(editor) }
}

export const onEditorScroll = (fn: (ratio: number, scrollTop: number) => void) => {
  scrollListeners.add(fn)
  return () => { scrollListeners.delete(fn) }
}

/** 折叠所有可折叠区域（当前所有编辑器） */
export const foldAllEditors = () => {
  mainEditor?.trigger('fold-all', 'editor.foldAll', null)
  extraEditors.forEach(e => e.trigger('fold-all', 'editor.foldAll', null))
}

/** 展开所有折叠区域（当前所有编辑器） */
export const unfoldAllEditors = () => {
  mainEditor?.trigger('unfold-all', 'editor.unfoldAll', null)
  extraEditors.forEach(e => e.trigger('unfold-all', 'editor.unfoldAll', null))
}
