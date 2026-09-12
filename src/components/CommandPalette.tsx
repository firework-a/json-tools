import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../store'
import { searchCommands, type AppCommand } from '../commands'

const GROUP_COLOR: Record<string, string> = {
  文件: '#5a9cf0',
  'JSON 变换': '#5fd478',
  视图: '#b578f0',
  模式: '#f0b840',
  工具箱: '#5ac8c8',
  其他: '#8b92a1',
}

export default function CommandPalette() {
  const open = useAppStore(s => s.paletteOpen)
  const setOpen = useAppStore(s => s.setPaletteOpen)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => searchCommands(query), [query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => { setActive(0) }, [query])

  // 保证选中项在可视区（必须在早退 return 之前，保持 hooks 调用顺序稳定）
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  if (!open) return null

  const run = (cmd?: AppCommand) => {
    if (!cmd) return
    setOpen(false)
    // 让面板先关闭再执行，避免部分命令（打开对话框/切模式）与关闭动画冲突
    setTimeout(() => { void cmd.run() }, 0)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(results.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[active]) }
  }

  return createPortal(
    <div className="cmdk-overlay" onMouseDown={() => setOpen(false)}>
      <div className="cmdk-panel" onMouseDown={e => e.stopPropagation()}>
        <div className="cmdk-inputrow">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="搜索命令…（↑↓ 选择 · Enter 执行 · Esc 关闭）"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
          />
          <kbd className="cmdk-esc">Esc</kbd>
        </div>
        <div className="cmdk-list" ref={listRef}>
          {results.length === 0 ? (
            <div className="cmdk-empty">没有匹配的命令</div>
          ) : results.map((cmd, i) => (
            <button
              key={cmd.id}
              data-idx={i}
              className={`cmdk-item ${i === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(cmd)}
            >
              <span className="cmdk-dot" style={{ background: GROUP_COLOR[cmd.group] ?? '#8b92a1' }} />
              <span className="cmdk-label">{cmd.label}</span>
              <span className="cmdk-group">{cmd.group}</span>
              {cmd.hint && <kbd className="cmdk-hint">{cmd.hint}</kbd>}
            </button>
          ))}
        </div>
        <div className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> 导航</span>
          <span><kbd>Enter</kbd> 执行</span>
          <span><kbd>Ctrl</kbd><kbd>K</kbd> 随时唤起</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
