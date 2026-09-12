import { useEffect, useState } from 'react'

/**
 * 值防抖：用于把「每次按键」的重计算（JSON.parse / 统计 / diff）
 * 降频到每 delayMs 至多一次。输入框等即时 UI 仍用原始值，不受影响。
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}
