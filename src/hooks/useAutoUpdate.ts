import { useEffect } from 'react'
import { useUpdateStore } from '@/updateStore'
import { useAppStore } from '@/store'

/** 运行期周期检查间隔（VS Code 同款 4h，覆盖长期不关机的场景） */
const PERIODIC_INTERVAL_MS = 4 * 60 * 60 * 1000
/** 启动检查的节流窗口：距上次实际检查不足 24h 则跳过，避免频繁重启反复打网络 */
const STARTUP_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000
/** 启动后延迟检查，不与冷启动抢资源（成熟产品通用做法） */
const STARTUP_DELAY_MS = 8000

/**
 * 自动更新检查的副作用入口（参考 VS Code / electron-updater / Sparkle）：
 * - 启动后延迟 8s 检查一次，且受 24h 节流（上次检查在 24h 内则跳过）；
 * - 运行期每 4h 周期检查，覆盖长时间开机的场景；
 * - 手动“检查更新”（设置/命令面板）不走此 hook，不受节流限制。
 * 状态与动作统一存放在 useUpdateStore（单一状态源）。
 */
export function useAutoUpdate(options?: { intervalMs?: number }) {
  const { intervalMs = PERIODIC_INTERVAL_MS } = options ?? {}
  const autoCheckUpdates = useAppStore(s => s.autoCheckUpdates)
  const check = useUpdateStore(s => s.check)

  useEffect(() => {
    if (!autoCheckUpdates) return

    const last = useAppStore.getState().lastUpdateCheckAt
    const dueAtStartup = Date.now() - last >= STARTUP_MIN_INTERVAL_MS
    let startupTimer = 0
    if (dueAtStartup) {
      startupTimer = window.setTimeout(() => void check(), STARTUP_DELAY_MS)
    }
    const interval = window.setInterval(() => void check(), intervalMs)

    return () => {
      if (startupTimer) window.clearTimeout(startupTimer)
      window.clearInterval(interval)
    }
  }, [autoCheckUpdates, intervalMs, check])
}
