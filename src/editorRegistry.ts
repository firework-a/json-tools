import type * as Monaco from 'monaco-editor'

/**
 * 当前挂载的所有 Monaco 编辑器实例。
 * 工具栏的折叠/展开需要跨组件拿到 editor，用模块级注册表统一管理。
 */
const editors = new Set<Monaco.editor.IStandaloneCodeEditor>()

/** 注册一个编辑器实例，返回注销函数 */
export const registerEditor = (editor: Monaco.editor.IStandaloneCodeEditor) => {
  editors.add(editor)
  return () => { editors.delete(editor) }
}

/** 折叠所有可折叠区域（当前所有编辑器） */
export const foldAllEditors = () => {
  editors.forEach((editor) => {
    editor.trigger('fold-all', 'editor.foldAll', null)
  })
}

/** 展开所有折叠区域（当前所有编辑器） */
export const unfoldAllEditors = () => {
  editors.forEach((editor) => {
    editor.trigger('unfold-all', 'editor.unfoldAll', null)
  })
}
