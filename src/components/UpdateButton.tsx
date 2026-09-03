import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { useAutoUpdate } from '@/hooks/useAutoUpdate'
import { DownloadIcon, CheckIcon, AlertCircleIcon, ArrowDownIcon } from './Icons'

export default function UpdateButton() {
  const { updateStatus, downloadProgress, checkNow, cancelDownload, installUpdate, isUpdateAvailable, isDownloading, isDownloaded, isInstalling } = useAutoUpdate({ immediate: false })
  const showToast = useAppStore(s => s.showToast)
  const [showProgress, setShowProgress] = useState(false)
  const [showInstallConfirm, setShowInstallConfirm] = useState(false)

  useEffect(() => {
    if (updateStatus.state === 'downloaded' || downloadProgress?.status === 'completed') {
      setShowInstallConfirm(true)
      setShowProgress(false)
    }
  }, [updateStatus.state, downloadProgress?.status])

  const handleClick = () => {
    if (isDownloading()) {
      cancelDownload()
      showToast('已取消下载')
      setShowProgress(false)
    } else if (isDownloaded()) {
      setShowInstallConfirm(true)
    } else if (isUpdateAvailable()) {
      setShowProgress(true)
      checkNow()
    }
  }

  const handleInstall = async () => {
    setShowInstallConfirm(false)
    await installUpdate()
  }

  const handleCancelInstall = () => {
    setShowInstallConfirm(false)
  }

  if (updateStatus.state === 'idle' && !isDownloaded()) return null

  const isError = updateStatus.state === 'error'

  return (
    <>
      {/* 右下角下载按钮 */}
      {!showInstallConfirm && (
        <div className={`update-button-wrapper ${showProgress ? 'expanded' : ''}`}>
          <button
            className={`update-button ${isDownloading() ? 'downloading' : ''} ${isDownloaded() ? 'ready' : ''} ${isError ? 'error' : ''}`}
            onClick={handleClick}
            title={
              isDownloading() ? '取消下载' :
              isDownloaded() ? '点击安装更新' :
              isUpdateAvailable() ? '下载更新' :
              isError ? '检查更新失败，点击重试' :
              '检查更新'
            }
            disabled={isInstalling()}
          >
            {isDownloading() && (
              <>
                <DownloadIcon size={16} className="update-btn-icon spinning" />
                <span className="update-btn-progress">
                  <span className="update-btn-percent">{Math.round(downloadProgress?.percent || 0)}%</span>
                  <span className="update-btn-speed">
                    {downloadProgress && downloadProgress.totalBytes > 0
                      ? `${(downloadProgress.bytesDownloaded / 1024 / 1024).toFixed(1)} / ${(downloadProgress.totalBytes / 1024 / 1024).toFixed(1)} MB`
                      : '准备中...'}
                  </span>
                </span>
              </>
            )}
            {isDownloaded() && !isDownloading() && (
              <>
                <CheckIcon size={16} className="update-btn-icon ready-pulse" />
                <span className="update-btn-text">安装更新</span>
              </>
            )}
            {isUpdateAvailable() && !isDownloading() && !isDownloaded() && (
              <>
                <ArrowDownIcon size={16} className="update-btn-icon" />
                <span className="update-btn-text">下载更新</span>
              </>
            )}
            {isError && (
              <>
                <AlertCircleIcon size={16} className="update-btn-icon" />
                <span className="update-btn-text">重试</span>
              </>
            )}
            {isInstalling() && (
              <>
                <DownloadIcon size={16} className="update-btn-icon spinning" />
                <span className="update-btn-text">安装中...</span>
              </>
            )}
          </button>

          {showProgress && isDownloading() && (
            <div className="update-progress-bar">
              <div
                className="update-progress-fill"
                style={{ width: `${downloadProgress?.percent || 0}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* 安装确认弹窗 */}
      {showInstallConfirm && (
        <div className="update-install-overlay" onClick={handleCancelInstall}>
          <div className="update-install-dialog" onClick={e => e.stopPropagation()}>
            <div className="update-install-header">
              <div className="update-install-icon">
                <CheckIcon size={24} />
              </div>
              <div className="update-install-title">更新已下载完成</div>
              <div className="update-install-version">版本 {updateStatus.state === 'downloaded' ? updateStatus.version : '未知'}</div>
            </div>
            <div className="update-install-message">
              更新包已准备就绪。安装后应用将自动重启，请确保已保存工作进度。
            </div>
            <div className="update-install-actions">
              <button className="update-install-btn cancel" onClick={handleCancelInstall}>
                取消
              </button>
              <button className="update-install-btn confirm" onClick={handleInstall}>
                立即安装并重启
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}