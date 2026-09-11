import { useEffect } from 'react'
import { useUpdateStore } from '@/updateStore'
import { useAppStore } from '@/store'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

/**
 * 只负责“启动时检查 + 每 4 小时定时检查”的副作用入口。
 * 更新状态与动作统一存放在 useUpdateStore（单一状态源），
 * 由 UpdateButton / SettingsPanel 订阅展示，避免多实例状态互不相通。
 */
export function useAutoUpdate(options?: { immediate?: boolean; intervalMs?: number }) {
  const { immediate = true, intervalMs = CHECK_INTERVAL_MS } = options ?? {}
  const autoCheckUpdates = useAppStore(s => s.autoCheckUpdates)
  const check = useUpdateStore(s => s.check)

  useEffect(() => {
    if (!autoCheckUpdates) return
    if (immediate) void check()
    const timer = window.setInterval(() => void check(), intervalMs)
    return () => window.clearInterval(timer)
  }, [autoCheckUpdates, immediate, intervalMs, check])
}
