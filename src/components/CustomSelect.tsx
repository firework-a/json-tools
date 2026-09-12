import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from './Icons'

export interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  /** 触发器最小宽度 */
  minWidth?: number
  /** 下拉对齐方式 */
  align?: 'left' | 'right'
  className?: string
  title?: string
}

/**
 * 自定义下拉框：替代原生 <select>，与工具栏/代码生成语言下拉风格统一。
 * 支持点击外部关闭、Esc 关闭、键盘上下选择与回车确认。
 */
export default function CustomSelect({ value, options, onChange, minWidth = 96, align = 'left', className = '', title }: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const current = options.find(o => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    setActiveIdx(Math.max(0, options.findIndex(o => o.value === value)))
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, options, value])

  const pick = (idx: number) => {
    const opt = options[idx]
    if (opt) onChange(opt.value)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); setOpen(true) }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(options.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(activeIdx) }
  }

  return (
    <div className={`csel ${open ? 'open' : ''} ${className}`} ref={rootRef} style={{ minWidth }} onKeyDown={onKeyDown}>
      <button
        type="button"
        className="csel-trigger"
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <span className="csel-value">{current?.label}</span>
        <ChevronDown size={11} className="csel-caret" />
      </button>
      {open && (
        <div className={`csel-menu ${align === 'right' ? 'right' : ''}`} role="listbox">
          {options.map((o, i) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`csel-item ${o.value === value ? 'active' : ''} ${i === activeIdx ? 'focused' : ''}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => pick(i)}
            >
              <span className="csel-item-label">{o.label}</span>
              {o.value === value && <span className="csel-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
