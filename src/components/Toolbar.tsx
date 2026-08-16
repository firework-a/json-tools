import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore, ViewMode } from '../store'
import { formatJson, compressJson, escapeJson, unescapeJson } from '../utils/json'
import { isTauri } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import {
  NewFileIcon, OpenIcon, ExportIcon,
  BeautifyIcon, CompressIcon, EscapeIcon, UnescapeIcon, FoldIcon, UnfoldIcon,
  DiffIcon, ConvertIcon, CodeIcon, SchemaIcon,
  TreeIcon, ThemeIcon, SettingsIcon, PinIcon, PinOffIcon,
} from './Icons'
import { foldAllEditors, unfoldAllEditors } from '../editorRegistry'
import ExportCanvas from './ExportCanvas'

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

interface ExportState {
  content: string
}

function Toolbar() {
  const {
    content, setContent, setRightContent,
    mode, setMode,
    treeOpen, setTreeOpen,
    newTab, setFileName, setEditorLanguage,
    toggleTheme, pinned, togglePinned, settingsOpen, setSettingsOpen,
  } = useAppStore()

  const [exportState, setExportState] = useState<ExportState | null>(null)

  const newFile = () => {
    newTab()
  }
  const loadFile = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.txt,.yaml,.yml'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      const text = await f.text()
      // 打开文件是新标签页：先建空 tab，再把内容/文件名写进去
      newTab()
      setContent(text)
      setFileName(f.name)
    }
    input.click()
  }

  const exportImage = () => {
    if (!content.trim()) {
      useAppStore.getState().showToast('没有可导出的内容')
      return
    }
    setExportState({ content })
  }

  const saveDataUrl = async (dataUrl: string) => {
    const fileName = useAppStore.getState().fileName || 'json'
    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    if (isTauri()) {
      const path = await save({
        defaultPath: `${fileName}.png`,
        filters: [{ name: 'PNG 图片', extensions: ['png'] }],
      })
      if (!path) return
      await writeFile(path, bytes)
      useAppStore.getState().showToast('图片已保存')
    } else {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${fileName}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      useAppStore.getState().showToast('图片已导出')
    }
  }

  const handleExportDone = async (dataUrl: string) => {
    setExportState(null)
    try {
      await saveDataUrl(dataUrl)
    } catch (e) {
      console.error('save image error:', e)
      useAppStore.getState().showToast('保存图片失败: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const handleExportError = (err: unknown) => {
    setExportState(null)
    console.error('export image error:', err)
    useAppStore.getState().showToast('导出图片失败: ' + (err instanceof Error ? err.message : String(err)))
  }

  const report = (result: string, error: string | null, language?: 'json' | 'plaintext') => {
    if (error) {
      useAppStore.getState().showToast(error)
      return
    }
    setContent(result)
    if (language) setEditorLanguage(language)
  }

  // 压缩转义 = 先压缩再转义
  const compressEscape = () => {
    const { result: c, error: e1 } = compressJson(content)
    if (e1) {
      useAppStore.getState().showToast(e1)
      return
    }
    const { result, error } = escapeJson(c)
    if (error) {
      useAppStore.getState().showToast(error)
    } else {
      setContent(result)
      setEditorLanguage('plaintext')
    }
  }

  const switchMode = (m: ViewMode) => {
    setMode(mode === m ? 'edit' : m)
    setRightContent('')
  }

  return (
    <header className="toolbar">
      {exportState && createPortal(
        <>
          <div className="export-mask">正在生成图片…</div>
          <ExportCanvas
            content={exportState.content}
            theme={useAppStore.getState().theme}
            showLineNumbers={useAppStore.getState().exportLineNumbers}
            scale={useAppStore.getState().exportScale}
            onDone={handleExportDone}
            onError={handleExportError}
          />
        </>,
        document.body,
      )}
      <div className="tb-group">
        <TB icon={<NewFileIcon size={14} color="#5a9cf0" />} label="新建" onClick={newFile} />
        <TB icon={<OpenIcon size={14} color="#f0b840" />} label="打开" onClick={loadFile} />
        <TB icon={<ExportIcon size={14} color="#e86868" />} label="导出图片" onClick={exportImage} />
      </div>

      <div className="tb-group">
        <TB icon={<BeautifyIcon size={14} color="#5fd478" />} label="美化" onClick={() => {
          const { result, error } = formatJson(content)
          report(result, error, 'json')
        }} />
        <TB icon={<CompressIcon size={14} color="#f0b840" />} label="压缩" onClick={() => {
          const { result, error } = compressJson(content)
          report(result, error, 'plaintext')
        }} />
        <TB icon={<EscapeIcon size={14} color="#b578f0" />} label="转义" onClick={() => {
          const { result, error } = escapeJson(content)
          report(result, error, 'plaintext')
        }} />
        <TB icon={<UnescapeIcon size={14} color="#5a9cf0" />} label="反转义" onClick={() => {
          const { result, error } = unescapeJson(content)
          report(result, error, 'json')
        }} />
        <TB icon={<CompressIcon size={14} color="#e86868" />} label="压缩转义" onClick={compressEscape} />
      </div>

      <div className="tb-group">
        <TB icon={<FoldIcon size={14} color="#e86868" />} label="折叠" onClick={foldAllEditors} />
        <TB icon={<UnfoldIcon size={14} color="#5fd478" />} label="展开" onClick={unfoldAllEditors} />
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
          {pinned ? <PinOffIcon size={15} /> : <PinIcon size={15} />}
        </button>
      </div>
    </header>
  )
}

export default Toolbar
