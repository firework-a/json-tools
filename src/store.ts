import { create } from 'zustand'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauri } from '@tauri-apps/api/core'
import type { CodeLang } from './utils/codeGen'

export type ViewMode = 'edit' | 'diff' | 'convert' | 'ts' | 'schema'
export type ConvertFormat = 'yaml' | 'xml' | 'toml' | 'csv'
export type ThemeMode = 'dark' | 'light'
export type EditorLanguage = 'json' | 'plaintext'

export type { CodeLang }

export interface EditorTab {
  id: string
  name: string
  content: string
  language: EditorLanguage
}

interface AppState {
  // 标签页
  tabs: EditorTab[]
  activeTabId: string
  newTab: () => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  renameTab: (id: string, name: string) => void

  // 当前活动标签的镜像（保持现有组件 API 兼容）
  content: string
  setContent: (c: string) => void
  fileName: string
  setFileName: (n: string) => void
  editorLanguage: EditorLanguage
  setEditorLanguage: (l: EditorLanguage) => void

  // 右侧内容（对比/转换/生成时使用）
  rightContent: string
  setRightContent: (c: string) => void

  // 模式
  mode: ViewMode
  setMode: (m: ViewMode) => void

  // 转换格式（convert 模式下）
  convertFormat: ConvertFormat
  setConvertFormat: (f: ConvertFormat) => void

  // 代码生成：目标语言 & 根类型名
  codeLang: CodeLang
  setCodeLang: (l: CodeLang) => void
  codeRootName: string
  setCodeRootName: (n: string) => void

  // 树形面板显示
  treeOpen: boolean
  setTreeOpen: (v: boolean) => void

  theme: ThemeMode
  toggleTheme: () => void
  setTheme: (t: ThemeMode) => void
  pinned: boolean
  togglePinned: () => void
  settingsOpen: boolean
  setSettingsOpen: (v: boolean) => void

  // ===== 设置项 =====
  // 编辑器
  autoFormat: boolean
  setAutoFormat: (v: boolean) => void
  showLineNumbers: boolean
  setShowLineNumbers: (v: boolean) => void
  fontSize: number
  setFontSize: (v: number) => void
  tabSize: number
  setTabSize: (v: number) => void
  wordWrap: boolean
  setWordWrap: (v: boolean) => void
  renderIndentGuides: boolean
  setRenderIndentGuides: (v: boolean) => void
  minimap: boolean
  setMinimap: (v: boolean) => void
  // 导出图片
  exportScale: number
  setExportScale: (v: number) => void
  exportLineNumbers: boolean
  setExportLineNumbers: (v: boolean) => void

  toast: string | null
  showToast: (msg: string | null) => void
}

let tabCounter = 0
const newUntitledName = () => `Untitled-${++tabCounter}`

const makeTab = (partial: Partial<EditorTab> = {}): EditorTab => ({
  id: `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  name: partial.name ?? newUntitledName(),
  content: partial.content ?? '',
  language: partial.language ?? 'json',
})

const firstTab = makeTab({ name: 'Untitled-1' })
// 让第一次新建从 -2 开始
tabCounter = 1

export const useAppStore = create<AppState>((set, get) => ({
  tabs: [firstTab],
  activeTabId: firstTab.id,

  content: firstTab.content,
  fileName: firstTab.name,
  editorLanguage: firstTab.language,

  rightContent: '',

  mode: 'edit',

  convertFormat: 'yaml',
  setConvertFormat: (convertFormat) => set({ convertFormat }),

  codeLang: 'typescript',
  setCodeLang: (codeLang) => set({ codeLang }),
  codeRootName: 'MyModel',
  setCodeRootName: (codeRootName) => set({ codeRootName }),

  treeOpen: true,
  setTreeOpen: (treeOpen) => set({ treeOpen }),

  newTab: () => set((s) => {
    const tab = makeTab()
    return {
      tabs: [...s.tabs, tab],
      activeTabId: tab.id,
      content: tab.content,
      fileName: tab.name,
      editorLanguage: tab.language,
      mode: 'edit',
      rightContent: '',
    }
  }),

  closeTab: (id) => set((s) => {
    if (s.tabs.length <= 1) {
      const tab = makeTab({ name: 'Untitled-1' })
      return {
        tabs: [tab],
        activeTabId: tab.id,
        content: '',
        fileName: tab.name,
        editorLanguage: 'json',
        mode: 'edit',
        rightContent: '',
      }
    }
    const idx = s.tabs.findIndex(t => t.id === id)
    const tabs = s.tabs.filter(t => t.id !== id)
    const next = tabs[Math.max(0, idx - 1)]
    return {
      tabs,
      activeTabId: next.id,
      content: next.content,
      fileName: next.name,
      editorLanguage: next.language,
      mode: 'edit',
      rightContent: '',
    }
  }),

  setActiveTab: (id) => set((s) => {
    const t = s.tabs.find(x => x.id === id)
    if (!t || t.id === s.activeTabId) return s
    return {
      activeTabId: id,
      content: t.content,
      fileName: t.name,
      editorLanguage: t.language,
      mode: 'edit',
      rightContent: '',
    }
  }),

  renameTab: (id, name) => set((s) => ({
    tabs: s.tabs.map(t => t.id === id ? { ...t, name } : t),
    ...(s.activeTabId === id ? { fileName: name } : {}),
  })),

  setContent: (content) => set((s) => ({
    content,
    tabs: s.tabs.map(t => t.id === s.activeTabId ? { ...t, content } : t),
  })),

  setFileName: (fileName) => set((s) => ({
    fileName,
    tabs: s.tabs.map(t => t.id === s.activeTabId ? { ...t, name: fileName } : t),
  })),

  setEditorLanguage: (editorLanguage) => set((s) => ({
    editorLanguage,
    tabs: s.tabs.map(t => t.id === s.activeTabId ? { ...t, language: editorLanguage } : t),
  })),

  setRightContent: (rightContent) => set({ rightContent }),

  setMode: (mode) => set({ mode, rightContent: '' }),

  theme: 'dark',
  toggleTheme: () => set((state) => {
    const theme = state.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = theme
    return { theme, toast: theme === 'dark' ? '已切换到深色主题' : '已切换到浅色主题' }
  }),
  setTheme: (theme) => set(() => {
    document.documentElement.dataset.theme = theme
    return { theme }
  }),
  pinned: false,
  togglePinned: async () => {
    const pinned = !get().pinned
    set({ pinned, toast: pinned ? '窗口已置顶' : '已取消置顶' })
    if (!isTauri()) return
    try {
      await getCurrentWindow().setAlwaysOnTop(pinned)
    } catch {
      // 置顶失败时回滚状态
      set({ pinned: !pinned })
      get().showToast('置顶失败')
    }
  },
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  autoFormat: true,
  setAutoFormat: (autoFormat) => set({ autoFormat }),
  showLineNumbers: true,
  setShowLineNumbers: (showLineNumbers) => set({ showLineNumbers }),
  fontSize: 13,
  setFontSize: (fontSize) => set({ fontSize }),
  tabSize: 2,
  setTabSize: (tabSize) => set({ tabSize }),
  wordWrap: true,
  setWordWrap: (wordWrap) => set({ wordWrap }),
  renderIndentGuides: true,
  setRenderIndentGuides: (renderIndentGuides) => set({ renderIndentGuides }),
  minimap: false,
  setMinimap: (minimap) => set({ minimap }),
  exportScale: 2,
  setExportScale: (exportScale) => set({ exportScale }),
  exportLineNumbers: true,
  setExportLineNumbers: (exportLineNumbers) => set({ exportLineNumbers }),
  toast: null,
  showToast: (toast) => set({ toast }),
}))
