// 完整 monaco-editor：注册全部编辑器服务（避免 ICodeLensCache / IInlayHintsCache /
// actionWidgetService 等 UNKNOWN service 报错）和全部内置语言。
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import jsonWorker from 'monaco-editor/language/json/json.worker.js?worker'
import { loader } from '@monaco-editor/react'

// 使用本地打包的 worker，离线/Tauri 可用，不走 CDN
self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'json') return new jsonWorker()
    return new editorWorker()
  },
}

loader.config({ monaco })
loader.init()

// 自定义主题：与应用编辑器配色一致
monaco.editor.defineTheme('app-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'd4d7dd' },
    { token: 'string.key.json', foreground: '9cdcfe' },
    { token: 'string.value.json', foreground: 'ce9178' },
    { token: 'number', foreground: 'b5cea8' },
    { token: 'keyword', foreground: '569cd6' },
    { token: 'delimiter', foreground: 'd4d4d4' },
  ],
  colors: {
    'editor.background': '#1a1d24',
    'editor.foreground': '#d4d7dd',
    'editorLineNumber.foreground': '#5a6170',
    'editorLineNumber.activeForeground': '#8b92a1',
    'editor.lineHighlightBackground': '#ffffff08',
    'editor.lineHighlightBorder': '#00000000',
    'editorGutter.background': '#1a1d24',
    'editorCursor.foreground': '#d4d7dd',
    'editor.selectionBackground': '#264f78',
    'editorIndentGuide.background1': '#ffffff10',
    'editorWidget.background': '#1f2330',
    'editorWidget.border': '#23272f',
    'scrollbarSlider.background': '#ffffff1a',
    'scrollbarSlider.hoverBackground': '#ffffff26',
  },
})

monaco.editor.defineTheme('app-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: '', foreground: '1f2937' },
    { token: 'string.key.json', foreground: '0451a5' },
    { token: 'string.value.json', foreground: 'a31515' },
    { token: 'number', foreground: '098658' },
    { token: 'keyword', foreground: '0000ff' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#1f2937',
    'editorLineNumber.foreground': '#94a3b8',
    'editorLineNumber.activeForeground': '#475569',
    'editor.lineHighlightBackground': '#f1f5f9',
    'editor.lineHighlightBorder': '#00000000',
    'editorGutter.background': '#f8fafc',
    'editorCursor.foreground': '#1f2937',
    'editor.selectionBackground': '#add6ff',
    'editorIndentGuide.background1': '#00000010',
    'editorWidget.background': '#f5f7fa',
    'editorWidget.border': '#d9dee7',
    'scrollbarSlider.background': '#0000001a',
    'scrollbarSlider.hoverBackground': '#00000026',
  },
})

export { monaco }
