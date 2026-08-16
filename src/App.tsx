import { useEffect } from 'react'
import TitleBar from './components/TitleBar'
import Toolbar from './components/Toolbar'
import TabBar from './components/TabBar'
import EditorArea from './components/EditorArea'
import TreeView from './components/TreeView'
import StatusBar from './components/StatusBar'
import { useAppStore } from './store'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauri } from '@tauri-apps/api/core'

function App() {
  const mode = useAppStore(s => s.mode)
  const toast = useAppStore(s => s.toast)
  const showToast = useAppStore(s => s.showToast)
  const isEditMode = mode === 'edit'

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
      {toast && <div className="app-toast">{toast}</div>}
    </div>
  )
}

export default App
