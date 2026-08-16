import { useState } from 'react'
import { useAppStore } from '../store'
import { copyToClipboard } from '../utils/json'
import { CopyIcon, CheckIcon } from './Icons'

interface Props {
  /** 要复制的文本；空字符串会提示"没有可复制的内容" */
  getText: () => string
  /** 按钮 title，默认"复制" */
  title?: string
  /** 复制成功后的 toast，默认"已复制到剪贴板" */
  successToast?: string
  className?: string
}

/**
 * 双栏工具页右上角的复制按钮：
 * 点击有缩放反馈，图标短暂变成对勾，并弹 toast 提示复制成功。
 */
export default function CopyButton({
  getText,
  title = '复制',
  successToast = '已复制到剪贴板',
  className = '',
}: Props) {
  const [copied, setCopied] = useState(false)
  const showToast = useAppStore(s => s.showToast)

  const onClick = async () => {
    const text = getText()
    if (!text) {
      showToast('没有可复制的内容')
      return
    }
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      showToast(successToast)
      window.setTimeout(() => setCopied(false), 1200)
    } else {
      showToast('复制失败，请手动选择文本复制')
    }
  }

  return (
    <button
      className={`tool-copy-flat copy-btn ${copied ? 'is-copied' : ''} ${className}`}
      onClick={onClick}
      title={title}
      type="button"
    >
      {copied ? <CheckIcon size={14} color="#5fd478" /> : <CopyIcon />}
    </button>
  )
}
