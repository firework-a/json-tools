import { create } from 'zustand'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauri } from '@tauri-apps/api/core'

export type ViewMode = 'edit' | 'diff' | 'convert' | 'ts' | 'schema'
export type ConvertFormat = 'yaml' | 'xml' | 'toml' | 'csv'
export type ThemeMode = 'dark' | 'light'

interface AppState {
  // 主编辑区内容
  content: string
  setContent: (c: string) => void

  // 右侧内容（对比/转换/生成时使用）
  rightContent: string
  setRightContent: (c: string) => void

  // 模式
  mode: ViewMode
  setMode: (m: ViewMode) => void

  // 转换格式（convert 模式下）
  convertFormat: ConvertFormat
  setConvertFormat: (f: ConvertFormat) => void

  // TS 接口名
  tsInterfaceName: string
  setTsInterfaceName: (n: string) => void

  // 树形面板显示
  treeOpen: boolean
  setTreeOpen: (v: boolean) => void

  fileName: string
  setFileName: (n: string) => void

  theme: ThemeMode
  toggleTheme: () => void
  pinned: boolean
  togglePinned: () => void
  settingsOpen: boolean
  setSettingsOpen: (v: boolean) => void

  // 设置项
  autoFormat: boolean
  setAutoFormat: (v: boolean) => void
  showLineNumbers: boolean
  setShowLineNumbers: (v: boolean) => void

  toast: string | null
  showToast: (msg: string | null) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  content: '',
  setContent: (content) => set({ content }),

  rightContent: '',
  setRightContent: (rightContent) => set({ rightContent }),

  mode: 'edit',
  setMode: (mode) => set({ mode, rightContent: '' }),

  convertFormat: 'yaml',
  setConvertFormat: (convertFormat) => set({ convertFormat }),

  tsInterfaceName: 'MyModel',
  setTsInterfaceName: (tsInterfaceName) => set({ tsInterfaceName }),

  treeOpen: true,
  setTreeOpen: (treeOpen) => set({ treeOpen }),

  fileName: 'Untitled-1',
  setFileName: (fileName) => set({ fileName }),

  theme: 'dark',
  toggleTheme: () => set((state) => {
    const theme = state.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = theme
    return { theme, toast: theme === 'dark' ? '已切换到深色主题' : '已切换到浅色主题' }
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
  toast: null,
  showToast: (toast) => set({ toast }),
}))
