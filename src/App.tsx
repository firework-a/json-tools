import Toolbar from './components/Toolbar'
import EditorArea from './components/EditorArea'
import TreeView from './components/TreeView'
import StatusBar from './components/StatusBar'
import { useAppStore } from './store'

function App() {
  const mode = useAppStore((s) => s.mode)
  // edit 模式显示完整工具栏 + 树形视图；工具模式进入独立双栏界面
  const isEditMode = mode === 'edit'

  return (
    <div className="app">
      {isEditMode && <Toolbar />}
      <div className="app-body">
        <div className="app-main">
          <EditorArea />
        </div>
        {isEditMode && <TreeView />}
      </div>
      <StatusBar />
    </div>
  )
}

export default App
