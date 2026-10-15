import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore, type ThemeMode } from '../store'
import appLogo from '../../src-tauri/icons/icon.png'
import { getAppVersion } from '../utils/updater'
import { useUpdateStore } from '../updateStore'
import { CloseIcon } from './Icons'

type SectionId = 'appearance' | 'editor' | 'export' | 'mcp' | 'updates' | 'about'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'appearance', label: '外观' },
  { id: 'editor', label: '编辑器' },
  { id: 'export', label: '导出图片' },
  { id: 'mcp', label: 'MCP' },
  { id: 'updates', label: '更新' },
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
      <ToggleRow label="粘贴自动修复" desc="粘贴非标准 JSON 时自动修复为合法 JSON" value={s.autoRepair} onChange={s.setAutoRepair} />
      <SegRow<0 | 1 | 2>
        label="树形默认展开层级"
        value={s.treeDefaultCollapse}
        options={[
          { value: 0, label: '全部展开' },
          { value: 1, label: '第 1 层' },
          { value: 2, label: '第 2 层' },
        ]}
        onChange={s.setTreeDefaultCollapse}
      />
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

const MCP_TOOLS: { name: string; desc: string }[] = [
  { name: 'json_repair', desc: '修复非标准 JSON（注释/单引号/尾逗号/截断）' },
  { name: 'json_format', desc: '格式化或压缩 JSON' },
  { name: 'json_validate', desc: '语法校验 + 可选 Schema 校验 + 统计' },
  { name: 'json_convert', desc: 'YAML / XML / TOML / CSV / NDJSON 互转' },
  { name: 'json_ndjson', desc: 'NDJSON ↔ JSON 数组互转' },
  { name: 'json_transform', desc: '键排序 / 扁平化 / 去 null / 去重' },
  { name: 'json_diff', desc: '对比两个 JSON 的差异' },
  { name: 'json_mock', desc: '从样例或 Schema 生成 Mock 数据' },
  { name: 'json_stats', desc: '键数 / 深度 / 大小 / 行数统计' },
  { name: 'json_query', desc: 'JSONPath / JMESPath 查询' },
  { name: 'json_table_extract', desc: '提取对象数组为表格行列' },
  { name: 'json_to_schema', desc: '从样例推断 JSON Schema' },
  { name: 'json_insights', desc: '智能分析：结构摘要 / 质量评分 / 建议' },
]

const MCP_REPO_URL = 'https://github.com/firework-a/json-tools'

const MCP_CONFIG_EXAMPLE = JSON.stringify({
  mcpServers: {
    'json-tools': {
      command: 'npx',
      args: ['tsx', 'mcp-server/index.ts'],
      cwd: '<克隆仓库的绝对路径>',
    },
  },
}, null, 2)

function McpSection() {
  const showToast = useAppStore(s => s.showToast)
  const [copied, setCopied] = useState(false)

  const copyConfig = async () => {
    try {
      await navigator.clipboard.writeText(MCP_CONFIG_EXAMPLE)
      setCopied(true)
      showToast('配置已复制到剪贴板')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      showToast('复制失败，请手动选择复制')
    }
  }

  return (
    <div className="set-section">
      <div className="set-section-title">MCP Server（AI 助手集成）</div>
      <p className="mcp-desc">
        MCP（Model Context Protocol）让 Claude Desktop、Codex、Cursor 等 AI
        助手直接调用 JSON Tools 的 12 个工具。<b>无需手动启动</b>——配置完成后，AI
        客户端会按下面的配置自动拉起本服务的独立进程（stdio 通信），与本应用是否运行无关。
      </p>
      <div className="mcp-block">
        <div className="mcp-block-title">
          客户端配置
          <button className="mcp-copy" onClick={copyConfig}>
            {copied ? '已复制 ✓' : '复制配置'}
          </button>
        </div>
        <pre className="mcp-code">{MCP_CONFIG_EXAMPLE}</pre>
        <div className="mcp-tip">
          前提：已克隆本仓库（{' '}
          <code>git clone {MCP_REPO_URL}.git</code>）并安装依赖（<code>pnpm install</code>）。
          把 <code>cwd</code> 改为克隆目录的绝对路径。开发调试也可以直接运行{' '}
          <code>pnpm mcp</code>。
        </div>
      </div>
      <div className="mcp-block">
        <div className="mcp-block-title">可用工具（{MCP_TOOLS.length} 个）</div>
        <div className="mcp-tools">
          {MCP_TOOLS.map(t => (
            <div key={t.name} className="mcp-tool-row">
              <code className="mcp-tool-name">{t.name}</code>
              <span className="mcp-tool-desc">{t.desc}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mcp-block">
        <div className="mcp-block-title">前置要求</div>
        <div className="mcp-tip">
          需要本机已安装 <b>Node.js</b>（AI 客户端会用 npx 拉起 tsx 运行本服务）。
          配置后重启 AI 客户端即可在对话中使用，例如：「用 json_repair 修复这段 JSON」。
        </div>
      </div>
    </div>
  )
}

function UpdatesSection() {  const s = useAppStore()
  const status = useUpdateStore(st => st.status)
  const progress = useUpdateStore(st => st.progress)
  const check = useUpdateStore(st => st.check)
  const startDownload = useUpdateStore(st => st.startDownload)
  const [version, setVersion] = useState('0.1.0')

  useEffect(() => {
    getAppVersion().then(setVersion).catch(() => setVersion('0.1.0'))
  }, [])

  const isDownloading = progress !== null
  const updateMessage = (() => {
    if (status.state === 'checking') return '正在检查 GitHub Releases 更新...'
    if (status.state === 'current' || status.state === 'unavailable' || status.state === 'error') return status.message
    if (status.state === 'available') return `发现新版本 ${status.version}，可点击下方“立即下载”或右下角按钮`
    if (status.state === 'downloaded') return `版本 ${status.version} 已下载完成，请在右下角确认安装`
    if (status.state === 'installing') return `正在安装 ${status.version}，完成后会自动重启`
    return '更新通过 GitHub Releases 分发'
  })()

  const busy = status.state === 'checking' || status.state === 'installing' || isDownloading

  return (
    <div className="set-section">
      <div className="set-section-title">更新设置</div>
      <ToggleRow
        label="自动检查更新"
        desc="启动 8 秒后及每 4 小时后台检查；距上次检查不足 24 小时则跳过本次启动检查"
        value={s.autoCheckUpdates}
        onChange={s.setAutoCheckUpdates}
      />
      <ToggleRow
        label="检查到更新后自动下载"
        desc="自动下载更新包，下载完成后弹窗确认安装（需先开启自动检查更新）"
        value={s.autoDownloadUpdates}
        onChange={s.setAutoDownloadUpdates}
      />
      <div className="set-row" style={{ marginTop: '8px' }}>
        <div className="set-row-text">
          <div className="set-row-label">当前版本</div>
          <div className="set-row-desc">jsontools · 版本 {version}</div>
        </div>
        <button
          className="about-action"
          onClick={() => void check({ notify: true })}
          disabled={busy}
          style={{ minWidth: '90px' }}
        >
          {status.state === 'checking' ? '检查中...' : '检查更新'}
        </button>
      </div>
      {isDownloading && (
        <div className="update-inline-progress">
          <div className="update-inline-fill" style={{ width: `${Math.round(progress.percent)}%` }} />
          <span className="update-inline-label">下载中 {Math.round(progress.percent)}%</span>
        </div>
      )}
      {status.state === 'available' && !isDownloading && (
        <button className="about-action" style={{ marginTop: '8px', width: '100%' }} onClick={() => void startDownload()}>
          立即下载
        </button>
      )}
      <div className="about-update-status" style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid', borderColor: '$border' }}>
        {updateMessage}
        {status.state === 'available' && status.notes && (
          <div className="about-update-notes" style={{ marginTop: '8px', fontSize: '11px', color: '$text-muted', whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'auto' }}>
            {status.notes}
          </div>
        )}
      </div>
    </div>
  )
}

function AboutSection() {
  const [version, setVersion] = useState('0.1.0')

  useEffect(() => {
    getAppVersion().then(setVersion).catch(() => setVersion('0.1.0'))
  }, [])

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
      <div className="about-tech">
        <div className="about-tech-title">快捷键</div>
        <div className="about-keys">
          {[
            ['Ctrl+N', '新建标签页'],
            ['Ctrl+O', '打开文件'],
            ['Ctrl+S / Ctrl+Shift+S', '保存 / 另存为'],
            ['Ctrl+B', '美化 JSON'],
            ['Ctrl+V', '粘贴（编辑器外直接粘贴剪贴板）'],
            ['Ctrl+K', '命令面板'],
          ].map(([k, d]) => (
            <div className="about-key-row" key={k}>
              <kbd className="about-kbd">{k}</kbd>
              <span className="about-key-desc">{d}</span>
            </div>
          ))}
        </div>
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
            {active === 'mcp' && <McpSection />}
            {active === 'updates' && <UpdatesSection />}
            {active === 'about' && <AboutSection />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
