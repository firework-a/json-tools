import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore, type ThemeMode } from '../store'
import { CloseIcon } from './Icons'

type SectionId = 'appearance' | 'editor' | 'export'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'appearance', label: '外观' },
  { id: 'editor', label: '编辑器' },
  { id: 'export', label: '导出图片' },
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
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
