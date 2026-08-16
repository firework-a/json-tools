import { getVersion } from '@tauri-apps/api/app'
import { isTauri } from '@tauri-apps/api/core'

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'unavailable'; message: string }
  | { state: 'current'; message: string }
  | { state: 'available'; version: string; notes?: string; install: () => Promise<void> }
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

  return {
    state: 'available',
    version: update.version,
    notes: update.body,
    install: async () => {
      await update.downloadAndInstall()
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    },
  }
}
