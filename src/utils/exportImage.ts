import { getHighlighter, toShikiLang } from './shiki'

export interface RenderOptions {
  code: string
  lang?: string
  theme: 'dark' | 'light'
  showLineNumbers: boolean
  maxWidth?: number // 画布最大 CSS 宽度（长行不折行，可能更宽）
  fontSize?: number
  lineHeight?: number
}

interface ThemeStyle {
  bg: string
  fg: string
  gutter: string
  border: string
}

const THEMES: Record<'dark' | 'light', ThemeStyle> = {
  dark: { bg: '#1a1d24', fg: '#d4d7dd', gutter: '#5a6170', border: '#23272f' },
  light: { bg: '#ffffff', fg: '#1f2937', gutter: '#94a3b8', border: '#e2e8f0' },
}

const FONT_FAMILY = "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, Menlo, 'Courier New', monospace"
// 各环境对 canvas 最大边长支持不同（Chromium 通常 16384，新版可达 32767）。
// 用保守值，再在运行时探测上调。
const FALLBACK_MAX_DIM = 16384

function detectMaxDim(): number {
  try {
    // 逐级探测 canvas 能承受的最大边长；32767 是 Chromium 常见上限
    for (const dim of [32767, 16384]) {
      const c = document.createElement('canvas')
      c.width = 256
      c.height = dim
      const ctx = c.getContext('2d')
      if (!ctx) continue
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, 1, dim)
      // 能成功导出非空 dataURL 即说明该尺寸可用
      const url = c.toDataURL('image/png')
      if (url.length > 100) return dim
    }
  } catch {
    /* ignore */
  }
  return FALLBACK_MAX_DIM
}

/**
 * 把代码用 Shiki 分词后直接绘制到单个 canvas，绕开 DOM / html-to-image。
 * 长行不折行（横向延伸）；内容超高/超宽时整体等比缩放，保证输出一张完整 PNG。
 */
export async function renderCodeToPng(opts: RenderOptions): Promise<string> {
  const {
    code, lang = 'json', theme, showLineNumbers,
    maxWidth = 2400, fontSize = 13, lineHeight = 20,
  } = opts

  const style = THEMES[theme]
  const highlighter = await getHighlighter()

  const lines = highlighter.codeToTokensBase(code, {
    lang: toShikiLang(lang),
    theme: theme === 'dark' ? 'dark-plus' : 'light-plus',
  })

  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = `${fontSize}px ${FONT_FAMILY}`
  const charW = measure.measureText('0').width || fontSize * 0.6

  const padX = 12
  const padTop = 8
  const padBottom = 12
  const gutterW = showLineNumbers ? 56 : 0

  // 计算内容自然宽度（不折行）
  let maxCols = 0
  for (const tokens of lines) {
    let len = 0
    for (const t of tokens) len += t.content.length
    if (len > maxCols) maxCols = len
  }
  const contentW = Math.min(maxCols * charW, maxWidth - padX * 2 - gutterW)
  const width = padX * 2 + gutterW + contentW
  const height = padTop + padBottom + lines.length * lineHeight

  // 等比缩放：让最终位图尺寸不超过 canvas 最大边长，且尽量用 2x 提升清晰度
  const MAX_DIM = detectMaxDim()
  let scale = 2
  if (width * scale > MAX_DIM) scale = Math.floor((MAX_DIM / width) * 10) / 10
  if (height * scale > MAX_DIM) scale = Math.min(scale, Math.floor((MAX_DIM / height) * 10) / 10)
  scale = Math.max(0.2, scale)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = style.bg
  ctx.fillRect(0, 0, width, height)
  ctx.textBaseline = 'top'

  if (showLineNumbers) {
    ctx.strokeStyle = style.border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padX + gutterW - 10, padTop)
    ctx.lineTo(padX + gutterW - 10, height - padBottom)
    ctx.stroke()
  }

  const contentX = padX + gutterW
  for (let i = 0; i < lines.length; i++) {
    const tokens = lines[i]
    const y = padTop + i * lineHeight

    if (showLineNumbers) {
      ctx.fillStyle = style.gutter
      ctx.textAlign = 'right'
      ctx.font = `${fontSize}px ${FONT_FAMILY}`
      ctx.fillText(String(i + 1), padX + gutterW - 16, y + 2)
    }

    ctx.textAlign = 'left'
    let x = contentX
    for (const t of tokens) {
      const color = t.color || style.fg
      const fs = t.fontStyle ?? 0
      const bold = (fs & 2) !== 0
      const italic = (fs & 1) !== 0
      ctx.fillStyle = color
      ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSize}px ${FONT_FAMILY}`
      ctx.fillText(t.content, x, y + 2)
      x += t.content.length * charW
    }
  }

  return canvas.toDataURL('image/png')
}
