import { useAppStore, ViewMode } from '../store'
import { formatJson, compressJson, escapeJson, unescapeJson } from '../utils/json'
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

  // 压缩转义 = 先压缩再转义
  const compressEscape = () => {
    const { result: c, error: e1 } = compressJson(content)
    if (e1) return
    const tmp = { result: c, error: null as string | null }
    try {
      const p = JSON.parse(c)
      tmp.result = JSON.stringify(JSON.stringify(p)).slice(1, -1)
    } catch (e) {
      tmp.error = e instanceof Error ? e.message : '错误'
    }
    if (!tmp.error) setContent(tmp.result)
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
        <TB icon={<ExportIcon size={14} color="#e86868" />} label="导出图片" />
      </div>

      <div className="tb-group">
        <TB icon={<BeautifyIcon size={14} color="#5fd478" />} label="美化" onClick={() => {
          const { result, error } = formatJson(content)
          if (!error) setContent(result)
        }} />
        <TB icon={<CompressIcon size={14} color="#f0b840" />} label="压缩" onClick={() => {
          const { result, error } = compressJson(content)
          if (!error) setContent(result)
        }} />
        <TB icon={<EscapeIcon size={14} color="#b578f0" />} label="转义" onClick={() => {
          const { result, error } = escapeJson(content)
          if (!error) setContent(result)
        }} />
        <TB icon={<UnescapeIcon size={14} color="#5a9cf0" />} label="反转义" onClick={() => {
          const { result, error } = unescapeJson(content)
          if (!error) setContent(result)
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
        <button className="tb-icon-btn" onClick={() => setTreeOpen(!treeOpen)} title="树形视图">
          <TreeIcon size={16} />
        </button>
        <button className="tb-icon-btn" title="主题">
          <ThemeIcon size={16} />
        </button>
        <button className="tb-icon-btn" title="设置">
          <SettingsIcon size={16} />
        </button>
        <button className="tb-icon-btn" title="固定">
          <PinIcon size={15} />
        </button>
      </div>
    </header>
  )
}

export default Toolbar
