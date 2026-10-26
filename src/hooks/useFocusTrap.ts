import { useEffect, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'

/** 模态弹层的焦点管理：打开时焦点移入、Tab 在弹层内循环、关闭时归还给触发元素 */
export function useFocusTrap<T extends HTMLElement>(ref: RefObject<T | null>, active: boolean) {
  useEffect(() => {
    const container = ref.current
    if (!active || !container) return
    const previous = document.activeElement as HTMLElement | null
    const focusables = () => [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
      // tabindex="-1" 的元素能被选择器命中（按钮/输入框），但它们不参与 Tab 序列
      .filter(el => el.tabIndex >= 0 && (el.offsetParent !== null || el === document.activeElement))

    const items = focusables()
    ;(items[0] ?? container).focus({ preventScroll: true })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !container.isConnected) return
      const list = focusables()
      if (!list.length) return
      const first = list[0]
      const last = list[list.length - 1]
      const current = document.activeElement
      const inside = !!current && container.contains(current)
      if (e.shiftKey && (!inside || current === first)) {
        e.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!e.shiftKey && (!inside || current === last)) {
        e.preventDefault()
        first.focus({ preventScroll: true })
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      if (previous?.isConnected && typeof previous.focus === 'function') previous.focus({ preventScroll: true })
    }
  }, [active, ref])
}
