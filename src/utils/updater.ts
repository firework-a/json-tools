import { getVersion } from '@tauri-apps/api/app'
import { isTauri } from '@tauri-apps/api/core'

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'unavailable'; message: string }
  | { state: 'current'; message: string }
  | { state: 'available'; version: string; notes?: string; install: () => Promise<void>; downloadAndInstall: (onProgress?: (event: { downloaded?: number; total?: number }) => void) => Promise<void> }
  | { state: 'downloaded'; version: string; install: () => Promise<void> }
  | { state: 'installing'; version: string }
  | { state: 'error'; message: string }

export async function getAppVersion() {
  if (!isTauri()) return import.meta.env.VITE_APP_VERSION ?? '0.1.0'
  return getVersion()
}

export async function checkAppUpdate(): Promise<UpdateStatus> {
  if (!isTauri()) {
    return { state: 'unavailable', message: '浏览器预览模式下不能检查桌面应用更新' }
  }

  const { check } = await import('@tauri-apps/plugin-updater')
  const update = await check()

  if (!update?.available) {
    return { state: 'current', message: '当前已是最新版本' }
  }

  // 记录本更新包是否已完成下载，避免 install 时重复走一遍 downloadAndInstall
  let downloaded = false

  return {
    state: 'available',
    version: update.version,
    notes: update.body,
    install: async () => {
      // 正常路径下 startDownload 已执行过 downloadAndInstall，这里只需重启生效；
      // 兜底：若未经过下载（直接安装），先完整下载再重启
      if (!downloaded) await update.downloadAndInstall()
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    },
    downloadAndInstall: async (onProgress?: (event: { downloaded?: number; total?: number }) => void) => {
      await update.downloadAndInstall(onProgress as any)
      downloaded = true
    },
  }
}
