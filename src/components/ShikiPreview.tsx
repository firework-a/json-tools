import { useEffect, useRef, useState } from 'react'
import { highlightToHtml } from '../utils/shiki'
import { useAppStore } from '../store'

interface Props {
  code: string
  lang?: string
}

/**
 * Shiki 只读高亮预览。结果面板（转换 / TS / Schema 右侧）使用：
 * 静态 HTML、无编辑器开销、颜色精确。
 */
export default function ShikiPreview({ code, lang = 'json' }: Props) {
  const theme = useAppStore(s => s.theme)
  const [html, setHtml] = useState('')
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    if (!code) { setHtml(''); return }
    highlightToHtml(code, lang, theme).then((h) => {
      if (!cancelled) setHtml(h)
    }).catch(() => {
      if (!cancelled) setHtml(`<pre class="shiki-fallback">${escapeForPre(code)}</pre>`)
    })
    return () => { cancelled = true }
  }, [code, lang, theme])

  return (
    <div className="shiki-wrap" ref={hostRef}>
      <div
        className="shiki-host"
        // Shiki 产出的 HTML 是我们本地生成的可信代码高亮
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

function escapeForPre(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
