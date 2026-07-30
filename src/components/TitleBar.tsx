import { useEffect, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { TLCloseIcon, TLMinimizeIcon, TLMaximizeIcon, TLRestoreIcon } from './Icons'

type BtnKind = 'close' | 'minimize' | 'maximize'

interface LightProps {
  kind: BtnKind
  showIcon: boolean
  maximized?: boolean
  onClick: () => void
}

function TrafficLight({ kind, showIcon, maximized, onClick }: LightProps) {
  const icon = (() => {
    if (!showIcon) return null
    if (kind === 'close')    return <TLCloseIcon size={11} />
    if (kind === 'minimize') return <TLMinimizeIcon size={11} />
    if (kind === 'maximize') return maximized ? <TLRestoreIcon size={11} /> : <TLMaximizeIcon size={11} />
    return null
  })()

  return (
    <button
      className="tl-light"
      data-kind={kind}
      onClick={onClick}
      aria-label={kind}
    >
      <span className={`tl-light-face ${showIcon ? 'is-hover' : ''}`}>
        <span className="tl-light-icon">{icon}</span>
      </span>
    </button>
  )
}

export default function TitleBar() {
  const appWindow = getCurrentWindow()
  const [maximized, setMaximized] = useState(false)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    let mounted = true
    const sync = () => {
      appWindow.isMaximized()
        .then(m => { if (mounted) setMaximized(m) })
        .catch(() => {})
    }
    sync()
    let unsub: (() => void) | null = null
    appWindow.onResized(() => sync()).then(u => { unsub = u })
    return () => {
      mounted = false
      if (unsub) unsub()
    }
  }, [appWindow])

  const onClose    = () => appWindow.close()
  const onMinimize = () => appWindow.minimize()
  const onMaximize = () => {
    if (maximized) {
      setMaximized(false)
      appWindow.unmaximize()
    } else {
      setMaximized(true)
      appWindow.maximize()
    }
  }

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div
        className="tl-lights"
        data-tauri-drag-region
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <TrafficLight kind="close"    showIcon={hover} onClick={onClose} />
        <TrafficLight kind="minimize" showIcon={hover} onClick={onMinimize} />
        <TrafficLight kind="maximize" showIcon={hover} maximized={maximized} onClick={onMaximize} />
      </div>
      <div className="tl-title" data-tauri-drag-region>开发者工具箱</div>
    </div>
  )
}
