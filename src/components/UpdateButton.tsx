import { useEffect, useState } from 'react'
import { useUpdateStore } from '@/updateStore'
import { DownloadIcon, CheckIcon, AlertCircleIcon } from './Icons'

/**
 * 右下角更新按钮（单一状态源 useUpdateStore 的展示层）。
 * 状态路径：
 *   available   → 圆形下载图标按钮，点击触发 startDownload
 *   downloading → 环绕进度（conic-gradient 圆环）+ 百分比，点击无效
 *   downloaded  → 自动弹出安装确认弹窗；弹窗关闭后点按钮可再次打开
 *   installing → 图标旋转，禁用
 *   error       → 警示图标，点击重新检查
 */
export default function UpdateButton() {
  const status = useUpdateStore(s => s.status)
  const progress = useUpdateStore(s => s.progress)
  const check = useUpdateStore(s => s.check)
  const startDownload = useUpdateStore(s => s.startDownload)
  const install = useUpdateStore(s => s.install)
  const [showInstallConfirm, setShowInstallConfirm] = useState(false)

  const isDownloading = progress !== null
  const isDownloaded = status.state === 'downloaded'
  const isInstalling = status.state === 'installing'
  const isError = status.state === 'error'
  const isAvailable = status.state === 'available'

  // 下载完成 → 触发现有的安装确认弹窗
  useEffect(() => {
    if (isDownloaded) setShowInstallConfirm(true)
  }, [isDownloaded])

  if (!isDownloading && !isDownloaded && !isInstalling && !isError && !isAvailable) return null

  const percent = Math.round(progress?.percent ?? 0)

  const handleClick = () => {
    if (isDownloading || isInstalling) return
    if (isAvailable) void startDownload()
    else if (isDownloaded) setShowInstallConfirm(true)
    else if (isError) void check()
  }

  const handleInstall = async () => {
    setShowInstallConfirm(false)
    await install()
  }

  const title =
    isDownloading ? `正在下载更新 ${percent}%` :
    isInstalling ? '正在安装，完成后自动重启' :
    isDownloaded ? '下载完成，点击安装' :
    isError ? '更新失败，点击重试' :
    `发现新版本 ${isAvailable ? status.version : ''}，点击下载`

  return (
    <>
      {!showInstallConfirm && (
        <button
          type="button"
          className={`update-button ${isDownloading ? 'downloading' : ''} ${isDownloaded ? 'ready' : ''} ${isError ? 'error' : ''}`}
          style={{ '--update-progress': percent } as React.CSSProperties}
          onClick={handleClick}
          disabled={isInstalling}
          title={title}
        >
          {/* 环绕进度：仅下载中显示，由 --update-progress 驱动 */}
          {isDownloading && <span className="update-ring" aria-hidden="true" />}
          {isDownloading ? (
            <span className="update-button-percent">{percent}%</span>
          ) : isDownloaded ? (
            <CheckIcon size={18} />
          ) : isError ? (
            <AlertCircleIcon size={18} />
          ) : (
            <DownloadIcon size={18} className={isInstalling ? 'update-btn-spin' : undefined} />
          )}
        </button>
      )}

      {/* 安装确认弹窗（现有弹窗，下载完成后自动触发） */}
      {showInstallConfirm && isDownloaded && (
        <div className="update-install-overlay" onClick={() => setShowInstallConfirm(false)}>
          <div className="update-install-dialog" onClick={e => e.stopPropagation()}>
            <div className="update-install-header">
              <div className="update-install-icon">
                <CheckIcon size={24} />
              </div>
              <div className="update-install-title">更新已下载完成</div>
              <div className="update-install-version">版本 {status.version}</div>
            </div>
            <div className="update-install-message">
              更新包已准备就绪。安装后应用将自动重启，请确保已保存工作进度。
            </div>
            <div className="update-install-actions">
              <button className="update-install-btn cancel" onClick={() => setShowInstallConfirm(false)}>
                稍后
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
