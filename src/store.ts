import { create } from 'zustand'

export type ViewMode = 'edit' | 'diff' | 'convert' | 'ts' | 'schema'
export type ConvertFormat = 'yaml' | 'xml' | 'toml' | 'csv'

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

  // 文件名（显示用）
  fileName: string
  setFileName: (n: string) => void
}

export const useAppStore = create<AppState>((set) => ({
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
}))
