import { useEffect, useState } from 'react'
import TitleBar from './components/TitleBar'
import Toolbar from './components/Toolbar'
import TabBar from './components/TabBar'
import EditorArea from './components/EditorArea'
import TreeView from './components/TreeView'
import StatusBar from './components/StatusBar'
import SettingsPanel from './components/SettingsPanel'
import { useAppStore } from './store'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauri } from '@tauri-apps/api/core'
import { readTextFileAt } from './utils/files'

function App() {
  const mode = useAppStore(s => s.mode)
  const toast = useAppStore(s => s.toast)
  const showToast = useAppStore(s => s.showToast)
  const openLoadedFile = useAppStore(s => s.openLoadedFile)
  const isEditMode = mode === 'edit'
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => showToast(null), 2000)
    return () => window.clearTimeout(timer)
  }, [toast, showToast])

  // 初始化主题标记
  useEffect(() => {
    document.documentElement.dataset.theme = useAppStore.getState().theme
  }, [])

  // 窗口初始 visible:false, 等 React 挂载完再显示, 避免出现透明空窗
  useEffect(() => {
    if (!isTauri()) return
    // 双 requestAnimationFrame 保证首帧已绘制
    let raf1 = 0, raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        getCurrentWindow().show().catch(() => { /* ignore */ })
      })
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [])

  // Tauri 原生文件拖拽
  useEffect(() => {
    if (!isTauri()) return
    let unlisten: (() => void) | null = null
    getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === 'over') {
        setDragOver(true)
      } else if (event.payload.type === 'drop') {
        setDragOver(false)
        const paths = event.payload.paths
        if (paths?.length) {
          readTextFileAt(paths[0])
            .then(openLoadedFile)
            .catch((e) => showToast('打开文件失败: ' + (e instanceof Error ? e.message : String(e))))
        }
      } else {
        setDragOver(false)
      }
    }).then(u => { unlisten = u })
    return () => { unlisten?.() }
  }, [openLoadedFile, showToast])

  // 浏览器预览环境的 HTML5 拖拽（同时阻止浏览器直接打开文件）
  useEffect(() => {
    if (isTauri()) return
    const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragOver(true) }
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragOver(false)
    }
    const onDrop = async (e: DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer?.files?.[0]
      if (!f) return
      const text = await f.text()
      openLoadedFile({
        name: f.name,
        content: text,
        language: /\.json$/i.test(f.name) ? 'json' : 'plaintext',
      })
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [openLoadedFile])

  return (
    <div className="app">
      <TitleBar />
      {isEditMode && <Toolbar />}
      {isEditMode && <TabBar />}
      <div className="app-body">
        <div className="app-main"><EditorArea /></div>
        {isEditMode && <TreeView />}
      </div>
      <StatusBar />
      <SettingsPanel />
      {toast && <div className="app-toast">{toast}</div>}
      {dragOver && (
        <div className="drop-overlay">
          <div className="drop-card">松开以打开文件</div>
        </div>
      )}
    </div>
  )
}

export default App
