import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store'

interface Props {
  code: string
  lang?: string
}

/** 同一 (code, lang, theme) 的最近结果缓存，避免来回切标签时重复高亮 */
const htmlCache = new Map<string, string>()
const CACHE_MAX = 24

/**
 * Shiki 只读高亮预览。结果面板（转换 / TS / Schema 右侧）使用：
 * 静态 HTML、无编辑器开销、颜色精确。
 * shiki 及语言 grammar 通过动态 import 拆分，仅结果面板挂载时才加载。
 */
export default function ShikiPreview({ code, lang = 'json' }: Props) {
  const theme = useAppStore(s => s.theme)
  const [html, setHtml] = useState('')
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    if (!code) { setHtml(''); return }
    const key = `${lang}|${theme}|${code.length}|${code.slice(0, 64)}|${code.slice(-64)}`
    const cached = htmlCache.get(key)
    if (cached) { setHtml(cached); return }
    import('../utils/shiki').then(({ highlightToHtml }) =>
      highlightToHtml(code, lang, theme)
    ).then((h) => {
      if (cancelled) return
      if (htmlCache.size > CACHE_MAX) htmlCache.clear()
      htmlCache.set(key, h)
      setHtml(h)
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
