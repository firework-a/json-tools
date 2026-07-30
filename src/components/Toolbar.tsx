import { useAppStore, ViewMode } from '../store'
import { formatJson, compressJson, escapeJson, unescapeJson } from '../utils/json'
import { toPng } from 'html-to-image'
import {
  NewFileIcon, OpenIcon, ExportIcon,
  BeautifyIcon, CompressIcon, EscapeIcon, UnescapeIcon, FoldIcon, UnfoldIcon,
  DiffIcon, ConvertIcon, CodeIcon, SchemaIcon,
  TreeIcon, ThemeIcon, SettingsIcon, PinIcon,
} from './Icons'

interface TBProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  active?: boolean
}
function TB({ icon, label, onClick, active }: TBProps) {
  return (
    <button className={`tb ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="tb-icon">{icon}</span>
      <span className="tb-label">{label}</span>
    </button>
  )
}

function Toolbar() {
  const {
    content, setContent, setRightContent,
    mode, setMode,
    treeOpen, setTreeOpen,
    setFileName,
    toggleTheme, pinned, togglePinned, settingsOpen, setSettingsOpen,
  } = useAppStore()

  const newFile = () => {
    setContent('')
    setRightContent('')
    setFileName('Untitled-1')
    setMode('edit')
  }
  const loadFile = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.txt,.yaml,.yml'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      setContent(await f.text())
      setFileName(f.name)
    }
    input.click()
  }

  const exportImage = async () => {
    const target = document.getElementById('editor-export-target')
    if (!target) return
    try {
      const dataUrl = await toPng(target, {
        backgroundColor: undefined,
        pixelRatio: 2,
        style: { borderRadius: '0' },
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${useAppStore.getState().fileName || 'json'}.png`
      a.click()
    } catch (e) {
      useAppStore.getState().showToast('导出图片失败')
    }
  }

  const report = (result: string, error: string | null) => {
    if (error) useAppStore.getState().showToast(error)
    else setContent(result)
  }

  // 压缩转义 = 先压缩再转义
  const compressEscape = () => {
    const { result: c, error: e1 } = compressJson(content)
    if (e1) {
      useAppStore.getState().showToast(e1)
      return
    }
    const { result, error } = escapeJson(c)
    if (error) useAppStore.getState().showToast(error)
    else setContent(result)
  }

  const switchMode = (m: ViewMode) => {
    setMode(mode === m ? 'edit' : m)
    setRightContent('')
  }

  return (
    <header className="toolbar">
      <div className="tb-group">
        <TB icon={<NewFileIcon size={14} color="#5a9cf0" />} label="新建" onClick={newFile} />
        <TB icon={<OpenIcon size={14} color="#f0b840" />} label="打开" onClick={loadFile} />
        <TB icon={<ExportIcon size={14} color="#e86868" />} label="导出图片" onClick={exportImage} />
      </div>

      <div className="tb-group">
        <TB icon={<BeautifyIcon size={14} color="#5fd478" />} label="美化" onClick={() => {
          const { result, error } = formatJson(content)
          report(result, error)
        }} />
        <TB icon={<CompressIcon size={14} color="#f0b840" />} label="压缩" onClick={() => {
          const { result, error } = compressJson(content)
          report(result, error)
        }} />
        <TB icon={<EscapeIcon size={14} color="#b578f0" />} label="转义" onClick={() => {
          const { result, error } = escapeJson(content)
          report(result, error)
        }} />
        <TB icon={<UnescapeIcon size={14} color="#5a9cf0" />} label="反转义" onClick={() => {
          const { result, error } = unescapeJson(content)
          report(result, error)
        }} />
        <TB icon={<CompressIcon size={14} color="#e86868" />} label="压缩转义" onClick={compressEscape} />
      </div>

      <div className="tb-group">
        <TB icon={<FoldIcon size={14} color="#e86868" />} label="折叠" />
        <TB icon={<UnfoldIcon size={14} color="#5fd478" />} label="展开" />
      </div>

      <div className="tb-group">
        <TB icon={<DiffIcon size={14} color="#5fd478" />} label="对比" active={mode === 'diff'} onClick={() => switchMode('diff')} />
        <TB icon={<ConvertIcon size={14} color="#5a9cf0" />} label="格式转换" active={mode === 'convert'} onClick={() => switchMode('convert')} />
        <TB icon={<CodeIcon size={14} color="#b578f0" />} label="生成代码" active={mode === 'ts'} onClick={() => switchMode('ts')} />
        <TB icon={<SchemaIcon size={14} color="#f0b840" />} label="Schema" active={mode === 'schema'} onClick={() => switchMode('schema')} />
      </div>

      <div className="tb-spacer" />

      <div className="tb-right">
        <button className={`tb-icon-btn ${treeOpen ? 'selected' : ''}`} onClick={() => setTreeOpen(!treeOpen)} title={treeOpen ? '隐藏树形视图' : '显示树形视图'}>
          <TreeIcon size={16} />
        </button>
        <button className="tb-icon-btn" onClick={toggleTheme} title="切换主题">
          <ThemeIcon size={16} />
        </button>
        <button className={`tb-icon-btn ${settingsOpen ? 'selected' : ''}`} onClick={() => setSettingsOpen(!settingsOpen)} title="设置">
          <SettingsIcon size={16} />
        </button>
        <button className={`tb-icon-btn ${pinned ? 'selected pinned' : ''}`} onClick={togglePinned} title={pinned ? '取消置顶' : '窗口置顶'}>
          <PinIcon size={15} />
        </button>
        {settingsOpen && (
          <div className="settings-popover">
            <div className="settings-title">设置</div>
            <label className="settings-option">
              <span>自动格式化</span><input type="checkbox" defaultChecked />
            </label>
            <label className="settings-option">
              <span>显示行号</span><input type="checkbox" defaultChecked />
            </label>
          </div>
        )}
      </div>
    </header>
  )
}

export default Toolbar
