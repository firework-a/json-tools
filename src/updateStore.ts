import { create } from 'zustand'
import { checkAppUpdate, type UpdateStatus } from '@/utils/updater'
import { useAppStore } from '@/store'

export interface DownloadProgress {
  percent: number
  bytesDownloaded: number
  totalBytes: number
}

interface UpdateStore {
  status: UpdateStatus
  progress: DownloadProgress | null
  /** 检查更新（启动时 / 每 4 小时 / 手动）。notify=true 时用 toast 反馈结果 */
  check: (opts?: { notify?: boolean }) => Promise<void>
  /** 下载当前可用更新，进度写入 progress；完成后 status → downloaded */
  startDownload: () => Promise<void>
  /** 安装确认弹窗点“立即安装”：更新包已下载，仅重启进入新版本 */
  install: () => Promise<void>
}

/**
 * 更新流程单一状态源。
 * 完整路径：check → available（右下角出现下载按钮）
 *   → 用户点击 startDownload（按钮环绕进度）
 *   → downloaded（触发安装确认弹窗）
 *   → install（重启生效）。
 * 设置开启“自动下载”时，check 到 available 后自动 startDownload，后续路径相同。
 */
export const useUpdateStore = create<UpdateStore>((set, get) => ({
  status: { state: 'idle' },
  progress: null,

  check: async (opts) => {
    const cur = get().status.state
    // 下载中 / 已下载待安装 / 安装中 / 正在检查：不重复触发
    if (cur === 'checking' || cur === 'downloaded' || cur === 'installing' || get().progress !== null) return
    set({ status: { state: 'checking' } })
    try {
      const result = await checkAppUpdate()
      if (result.state === 'available') {
        set({ status: result })
        if (useAppStore.getState().autoDownloadUpdates) await get().startDownload()
      } else {
        set({ status: result })
        if (opts?.notify && (result.state === 'current' || result.state === 'unavailable')) {
          useAppStore.getState().showToast(result.message)
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      set({ status: { state: 'error', message } })
      if (opts?.notify) useAppStore.getState().showToast(`检查更新失败: ${message}`)
    }
  },

  startDownload: async () => {
    const status = get().status
    if (status.state !== 'available' || get().progress !== null) return
    set({ progress: { percent: 0, bytesDownloaded: 0, totalBytes: 0 } })
    try {
      await status.downloadAndInstall((event) => {
        const downloaded = event.downloaded ?? 0
        const total = event.total ?? 0
        set({
          progress: {
            percent: total > 0 ? Math.min(100, (downloaded / total) * 100) : 0,
            bytesDownloaded: downloaded,
            totalBytes: total,
          },
        })
      })
      set({
        progress: null,
        status: { state: 'downloaded', version: status.version, install: status.install },
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      set({ progress: null, status: { state: 'error', message } })
    }
  },

  install: async () => {
    const status = get().status
    if (status.state !== 'downloaded') return
    set({ status: { state: 'installing', version: status.version } })
    try {
      await status.install()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      set({ status: { state: 'error', message } })
    }
  },
}))
