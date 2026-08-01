import { ViewPlugin, type ViewUpdate, type EditorView } from '@codemirror/view'
import { foldAll, unfoldAll, ensureSyntaxTree } from '@codemirror/language'

/**
 * 当前挂载的所有 CodeMirror 编辑器实例。
 * 工具栏的折叠/展开需要跨组件拿到 view，用模块级注册表统一管理。
 * 通过 editorRegistration 扩展在 view 创建/销毁时自动增删，避免时序问题。
 */
const views = new Set<EditorView>()

/** 注册一个编辑器实例，返回注销函数 */
export const registerEditor = (v: EditorView) => {
  views.add(v)
  return () => { views.delete(v) }
}

/**
 * 放进任意编辑器 extensions 数组里的扩展：
 * view 创建时注册，view 销毁时自动注销。
 */
export const editorRegistration = ViewPlugin.fromClass(class {
  constructor(private view: EditorView) { views.add(view) }
  destroy() { views.delete(this.view) }
  // 更新占位（插件需要一个 update 方法才会被认为是响应式插件，这里无需处理）
  update(_u: ViewUpdate) {}
})

/** 折叠所有可折叠区域（当前所有编辑器） */
export const foldAllEditors = () => {
  views.forEach((v) => {
    // 大文档语法树是惰性解析的, 先确保整棵树可用, foldAll 才能找到所有折叠点
    ensureSyntaxTree(v.state, v.state.doc.length, 5000)
    foldAll(v)
  })
}

/** 展开所有折叠区域（当前所有编辑器） */
export const unfoldAllEditors = () => {
  views.forEach((v) => unfoldAll(v))
}
