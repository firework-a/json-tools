import { useEffect, useRef, useState } from 'react'
import { useAppStore, ViewMode } from '../store'
import { formatJson, compressJson, escapeJson, unescapeJson } from '../utils/json'
import { toPng } from 'html-to-image'
import { isTauri } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
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
    autoFormat, setAutoFormat, showLineNumbers, setShowLineNumbers,
  } = useAppStore()

  const settingsRef = useRef<HTMLDivElement>(null)
  const [popPos, setPopPos] = useState<{ top: number; right: number } | null>(null)

  const openSettings = () => {
    if (settingsOpen) {
      setSettingsOpen(false)
      return
    }
    if (settingsRef.current) {
      const r = settingsRef.current.getBoundingClientRect()
      setPopPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    }
    setSettingsOpen(true)
  }

  useEffect(() => {
    if (!settingsOpen) return
    const onDown = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSettingsOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [settingsOpen, setSettingsOpen])

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
    if (!target) {
      useAppStore.getState().showToast('找不到导出目标')
      return
    }
    try {
      const theme = useAppStore.getState().theme
      const fileName = useAppStore.getState().fileName || 'json'
      const dataUrl = await toPng(target, {
        backgroundColor: theme === 'light' ? '#ffffff' : '#1e2128',
        pixelRatio: 2,
        style: { borderRadius: '0', border: 'none' },
        cacheBust: true,
      })
      // dataURL -> Uint8Array
      const base64 = dataUrl.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

      // Tauri 环境: 弹系统保存对话框
      if (isTauri()) {
        const path = await save({
          defaultPath: `${fileName}.png`,
          filters: [{ name: 'PNG 图片', extensions: ['png'] }],
        })
        if (!path) return // 用户取消
        await writeFile(path, bytes)
        useAppStore.getState().showToast('图片已保存')
      } else {
        // 浏览器回退
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${fileName}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        useAppStore.getState().showToast('图片已导出')
      }
    } catch (e) {
      console.error('export image error:', e)
      useAppStore.getState().showToast('导出图片失败: ' + (e instanceof Error ? e.message : String(e)))
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
        <div className="tb-icon-wrap" ref={settingsRef}>
          <button className={`tb-icon-btn ${settingsOpen ? 'selected' : ''}`} onClick={openSettings} title="设置">
            <SettingsIcon size={16} />
          </button>
          {settingsOpen && popPos && (
            <div className="settings-popover" style={{ position: 'fixed', top: popPos.top, right: popPos.right }}>
              <div className="settings-title">设置</div>
              <label className="settings-option">
                <span>自动格式化</span>
                <input type="checkbox" checked={autoFormat} onChange={e => setAutoFormat(e.target.checked)} />
              </label>
              <label className="settings-option">
                <span>显示行号</span>
                <input type="checkbox" checked={showLineNumbers} onChange={e => setShowLineNumbers(e.target.checked)} />
              </label>
            </div>
          )}
        </div>
        <button className={`tb-icon-btn ${pinned ? 'selected pinned' : ''}`} onClick={togglePinned} title={pinned ? '取消置顶' : '窗口置顶'}>
          <PinIcon size={15} />
        </button>
      </div>
    </header>
  )
}

export default Toolbar
