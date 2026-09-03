import { useEffect, useRef, useState, useCallback } from 'react'
import { checkAppUpdate, type UpdateStatus } from '@/utils/updater'
import { useAppStore } from '@/store'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

interface DownloadProgress {
  bytesDownloaded: number
  totalBytes: number
  percent: number
  status: 'downloading' | 'paused' | 'completed' | 'error'
  error?: string
}

interface UseAutoUpdateReturn {
  updateStatus: UpdateStatus
  downloadProgress: DownloadProgress | null
  checkNow: () => Promise<void>
  dismiss: () => void
  cancelDownload: () => void
  installUpdate: () => Promise<void>
  isUpdateAvailable: () => boolean
  isDownloading: () => boolean
  isDownloaded: () => boolean
  isInstalling: () => boolean
}

export function useAutoUpdate(options?: { immediate?: boolean; intervalMs?: number }): UseAutoUpdateReturn {
  const { immediate = true, intervalMs = CHECK_INTERVAL_MS } = options ?? {}
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCheckingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const { autoCheckUpdates, autoDownloadUpdates } = useAppStore()

  const performCheck = useCallback(async (showProgress = false) => {
    if (isCheckingRef.current) return
    isCheckingRef.current = true

    if (showProgress) {
      setUpdateStatus({ state: 'checking' })
    }

    try {
      const result = await checkAppUpdate()
      setUpdateStatus(result)

      if (result.state === 'available' && autoDownloadUpdates) {
        startDownload(result)
      }
    } catch (e) {
      setUpdateStatus({ state: 'error', message: String(e) })
    } finally {
      isCheckingRef.current = false
    }
  }, [autoDownloadUpdates])

  const startDownload = useCallback(async (updateInfo: Extract<UpdateStatus, { state: 'available' }>) => {
    setDownloadProgress({
      bytesDownloaded: 0,
      totalBytes: 0,
      percent: 0,
      status: 'downloading'
    })

    abortControllerRef.current = new AbortController()

    try {
      await updateInfo.downloadAndInstall((event) => {
        if (event.downloaded !== undefined && event.total !== undefined) {
          const percent = event.total > 0 ? (event.downloaded / event.total) * 100 : 0
          setDownloadProgress({
            bytesDownloaded: event.downloaded,
            totalBytes: event.total,
            percent,
            status: 'downloading'
          })
        }
      })

      setDownloadProgress(prev => prev ? { ...prev, percent: 100, status: 'completed' } : null)
      setUpdateStatus({ state: 'downloaded', version: updateInfo.version, install: updateInfo.install })
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        setDownloadProgress(prev => prev ? { ...prev, status: 'paused' } : null)
      } else {
        const message = e instanceof Error ? e.message : String(e)
        setDownloadProgress(prev => prev ? { ...prev, status: 'error', error: message } : null)
        setUpdateStatus({ state: 'error', message })
      }
    }
  }, [])

  const cancelDownload = useCallback(() => {
    abortControllerRef.current?.abort()
    setDownloadProgress(null)
    setUpdateStatus({ state: 'idle' })
  }, [])

  const installUpdate = useCallback(async () => {
    if (updateStatus.state !== 'downloaded') return
    const version = updateStatus.version
    setUpdateStatus({ state: 'installing', version })
    try {
      await updateStatus.install()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setUpdateStatus({ state: 'error', message })
    }
  }, [updateStatus])

  const scheduleNextCheck = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (autoCheckUpdates) {
        performCheck(false)
      }
      scheduleNextCheck()
    }, intervalMs)
  }, [intervalMs, performCheck, autoCheckUpdates])

  const checkNow = useCallback(async () => {
    await performCheck(true)
  }, [performCheck])

  const dismiss = useCallback(() => {
    setUpdateStatus({ state: 'idle' })
    setDownloadProgress(null)
  }, [])

  const isUpdateAvailable = useCallback(() => {
    return updateStatus.state === 'available'
  }, [updateStatus])

  const isDownloading = useCallback(() => {
    return downloadProgress?.status === 'downloading'
  }, [downloadProgress])

  const isDownloaded = useCallback(() => {
    return updateStatus.state === 'downloaded' || downloadProgress?.status === 'completed'
  }, [updateStatus, downloadProgress])

  const isInstalling = useCallback(() => {
    return updateStatus.state === 'installing'
  }, [updateStatus])

  useEffect(() => {
    if (immediate && autoCheckUpdates) {
      performCheck(false)
    }
    if (autoCheckUpdates) {
      scheduleNextCheck()
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      abortControllerRef.current?.abort()
    }
  }, [immediate, autoCheckUpdates, performCheck, scheduleNextCheck])

  useEffect(() => {
    if (autoCheckUpdates) {
      scheduleNextCheck()
    } else if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }, [autoCheckUpdates, scheduleNextCheck])

  return {
    updateStatus,
    downloadProgress,
    checkNow,
    dismiss,
    cancelDownload,
    installUpdate,
    isUpdateAvailable,
    isDownloading,
    isDownloaded,
    isInstalling,
  }
}