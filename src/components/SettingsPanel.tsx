import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore, type ThemeMode } from '../store'
import appLogo from '../../src-tauri/icons/icon.png'
import { checkAppUpdate, getAppVersion, type UpdateStatus } from '../utils/updater'
import { CloseIcon } from './Icons'

type SectionId = 'appearance' | 'editor' | 'export' | 'about'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'appearance', label: '外观' },
  { id: 'editor', label: '编辑器' },
  { id: 'export', label: '导出图片' },
  { id: 'about', label: '关于' },
]

/** 单个开关项 */
function ToggleRow({ label, desc, value, onChange }: {
  label: string
  desc?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="set-row">
      <div className="set-row-text">
        <div className="set-row-label">{label}</div>
        {desc && <div className="set-row-desc">{desc}</div>}
      </div>
      <button
        className={`set-switch ${value ? 'on' : ''}`}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
      >
        <span className="set-switch-knob" />
      </button>
    </div>
  )
}

/** 数值滑块项 */
function SliderRow({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="set-row">
      <div className="set-row-text">
        <div className="set-row-label">{label}</div>
      </div>
      <div className="set-slider-wrap">
        <input
          type="range"
          className="set-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="set-slider-value">{value}{unit}</span>
      </div>
    </div>
  )
}

/** 分段选择（如主题、tab 大小） */
function SegRow<T extends string | number>({ label, value, options, onChange }: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="set-row">
      <div className="set-row-text">
        <div className="set-row-label">{label}</div>
      </div>
      <div className="set-seg">
        {options.map((o) => (
          <button
            key={String(o.value)}
            className={`set-seg-item ${o.value === value ? 'active' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function AppearanceSection() {
  const theme = useAppStore(s => s.theme)
  const setTheme = useAppStore(s => s.setTheme)
  return (
    <div className="set-section">
      <div className="set-section-title">外观</div>
      <SegRow<ThemeMode>
        label="主题"
        value={theme}
        options={[
          { value: 'dark', label: '深色' },
          { value: 'light', label: '浅色' },
        ]}
        onChange={setTheme}
      />
    </div>
  )
}

function EditorSection() {
  const s = useAppStore()
  return (
    <div className="set-section">
      <div className="set-section-title">编辑器</div>
      <SliderRow label="字体大小" value={s.fontSize} min={11} max={22} unit=" px" onChange={s.setFontSize} />
      <SegRow<number>
        label="缩进宽度"
        value={s.tabSize}
        options={[
          { value: 2, label: '2' },
          { value: 4, label: '4' },
        ]}
        onChange={s.setTabSize}
      />
      <ToggleRow label="自动换行" desc="长行超出视口时换行显示" value={s.wordWrap} onChange={s.setWordWrap} />
      <ToggleRow label="显示行号" value={s.showLineNumbers} onChange={s.setShowLineNumbers} />
      <ToggleRow label="缩进参考线" value={s.renderIndentGuides} onChange={s.setRenderIndentGuides} />
      <ToggleRow label="迷你地图" desc="显示代码缩略导航" value={s.minimap} onChange={s.setMinimap} />
      <ToggleRow label="粘贴自动格式化" desc="粘贴单行压缩 JSON 时自动展开" value={s.autoFormat} onChange={s.setAutoFormat} />
    </div>
  )
}

function ExportSection() {
  const s = useAppStore()
  return (
    <div className="set-section">
      <div className="set-section-title">导出图片</div>
      <SliderRow label="清晰度" value={s.exportScale} min={1} max={3} step={0.5} unit="x" onChange={s.setExportScale} />
      <ToggleRow label="包含行号" desc="导出图中保留行号与分隔线" value={s.exportLineNumbers} onChange={s.setExportLineNumbers} />
    </div>
  )
}

function AboutSection() {
  const showToast = useAppStore(s => s.showToast)
  const [version, setVersion] = useState('0.1.0')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' })

  useEffect(() => {
    getAppVersion().then(setVersion).catch(() => setVersion('0.1.0'))
  }, [])

  const onCheckUpdate = async () => {
    setUpdateStatus({ state: 'checking' })
    try {
      const status = await checkAppUpdate()
      setUpdateStatus(status)
      if (status.state === 'current' || status.state === 'unavailable') showToast(status.message)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setUpdateStatus({ state: 'error', message })
      showToast(`检查更新失败: ${message}`)
    }
  }

  const onInstallUpdate = async () => {
    if (updateStatus.state !== 'available') return
    const version = updateStatus.version
    setUpdateStatus({ state: 'installing', version })
    try {
      await updateStatus.install()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setUpdateStatus({ state: 'error', message })
      showToast(`安装更新失败: ${message}`)
    }
  }

  const updateMessage = (() => {
    if (updateStatus.state === 'checking') return '正在检查 GitHub Releases 更新...'
    if (updateStatus.state === 'current' || updateStatus.state === 'unavailable' || updateStatus.state === 'error') return updateStatus.message
    if (updateStatus.state === 'available') return `发现新版本 ${updateStatus.version}`
    if (updateStatus.state === 'installing') return `正在安装 ${updateStatus.version}，完成后会自动重启`
    return '更新通过 GitHub Releases 分发'
  })()

  return (
    <div className="set-section">
      <div className="set-section-title">关于</div>
      <div className="about-app">
        <div className="about-logo">
          <img src={appLogo} alt="JSON TOOLS" />
        </div>
        <div className="about-info">
          <div className="about-name">JSON TOOLS</div>
          <div className="about-version">jsontools · 版本 {version}</div>
        </div>
      </div>
      <p className="about-desc">
        面向开发者的 JSON 桌面工具：格式化、压缩/转义、格式转换（YAML / XML / TOML / CSV）、
        TypeScript 等多语言类型生成、JSON Schema、代码对比与图片导出。
      </p>
      <div className="about-update">
        <div className="about-update-text">
          <div className="about-tech-title">应用更新</div>
          <div className="about-update-status">{updateMessage}</div>
          {updateStatus.state === 'available' && updateStatus.notes && (
            <div className="about-update-notes">{updateStatus.notes}</div>
          )}
        </div>
        {updateStatus.state === 'available' ? (
          <button className="about-action" onClick={onInstallUpdate}>安装并重启</button>
        ) : (
          <button className="about-action" onClick={onCheckUpdate} disabled={updateStatus.state === 'checking' || updateStatus.state === 'installing'}>
            {updateStatus.state === 'checking' ? '检查中...' : '检查更新'}
          </button>
        )}
      </div>
      <div className="about-tech">
        <div className="about-tech-title">技术栈</div>
        <div className="about-tech-tags">
          <span className="about-tag">Tauri 2</span>
          <span className="about-tag">React 18</span>
          <span className="about-tag">TypeScript</span>
          <span className="about-tag">Monaco Editor</span>
          <span className="about-tag">Shiki</span>
          <span className="about-tag">QuickType</span>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPanel() {
  const open = useAppStore(s => s.settingsOpen)
  const setOpen = useAppStore(s => s.setSettingsOpen)
  const [active, setActive] = useState<SectionId>('editor')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  return createPortal(
    <div className="settings-overlay" onClick={() => setOpen(false)}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-side">
          <div className="settings-side-header">设置</div>
          <div className="settings-nav">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                className={`settings-nav-item ${active === sec.id ? 'active' : ''}`}
                onClick={() => setActive(sec.id)}
              >
                {sec.label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-main">
          <div className="settings-main-header">
            <span className="settings-main-title">{SECTIONS.find(s => s.id === active)?.label}</span>
            <button className="settings-close" onClick={() => setOpen(false)} title="关闭">
              <CloseIcon size={15} />
            </button>
          </div>
          <div className="settings-main-body">
            {active === 'appearance' && <AppearanceSection />}
            {active === 'editor' && <EditorSection />}
            {active === 'export' && <ExportSection />}
            {active === 'about' && <AboutSection />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
