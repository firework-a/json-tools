import { useEffect } from 'react'
import TitleBar from './components/TitleBar'
import Toolbar from './components/Toolbar'
import EditorArea from './components/EditorArea'
import TreeView from './components/TreeView'
import StatusBar from './components/StatusBar'
import { useAppStore } from './store'

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

  return (
    <div className="app">
      <TitleBar />
      {isEditMode && <Toolbar />}
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
