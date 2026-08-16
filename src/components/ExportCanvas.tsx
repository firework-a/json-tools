import { useEffect, useRef } from 'react'
import type { ThemeMode } from '../store'
import { renderCodeToPng } from '../utils/exportImage'

interface Props {
  content: string
  theme: ThemeMode
  showLineNumbers: boolean
  scale: number
  onDone: (dataUrl: string) => void
  onError: (err: unknown) => void
}

/**
 * 导出画布：直接用 Canvas 2D 按 Shiki token 颜色逐字绘制，
 * 不经过 DOM / html-to-image，长行不折行，内容超高时整体等比缩放，
 * 始终输出一张完整 PNG。组件本身不渲染可见 DOM，挂载时触发一次绘制。
 */
export default function ExportCanvas({ content, theme, showLineNumbers, scale, onDone, onError }: Props) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    let cancelled = false
    const finish = (fn: () => void) => {
      if (!firedRef.current) {
        firedRef.current = true
        fn()
      }
    }

    ;(async () => {
      try {
        const dataUrl = await renderCodeToPng({ code: content, lang: 'json', theme, showLineNumbers, scale })
        if (!cancelled) finish(() => onDone(dataUrl))
      } catch (e) {
        console.error('[export] canvas render failed', e)
        if (!cancelled) finish(() => onError(e))
      }
    })()

    const timer = window.setTimeout(() => {
      finish(() => onError(new Error('导出超时')))
    }, 30000)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [content, theme, showLineNumbers, scale, onDone, onError])

  return null
}
