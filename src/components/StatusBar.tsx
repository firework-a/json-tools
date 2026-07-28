import { useMemo } from 'react'
import { useAppStore } from '../store'
import { getJsonStats } from '../utils/json'

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function StatusBar() {
  const { content, rightContent, mode, fileName } = useAppStore()

  const leftStats = useMemo(() => getJsonStats(content), [content])
  const rightStats = useMemo(() => getJsonStats(rightContent), [rightContent])

  // 对比模式：统计左右差异行数（按 formatted 行数差的绝对值）
  const diffCount = useMemo(() => {
    if (mode !== 'diff') return null
    if (!content.trim() || !rightContent.trim()) return null
    return Math.abs(leftStats.lineCount - rightStats.lineCount) || null
  }, [mode, content, rightContent, leftStats.lineCount, rightStats.lineCount])

  return (
    <footer className="status-bar">
      <div className="status-left">
        <span className="status-filename">{fileName}</span>
        <span className="status-sep">|</span>
        <span>{leftStats.keyCount} 个键</span>
        <span className="status-sep">|</span>
        <span>{leftStats.depth} 层</span>
        <span className="status-sep">|</span>
        <span>{formatSize(leftStats.size)}</span>
        <span className="status-sep">|</span>
        <span>{leftStats.lineCount} 行</span>
        {!leftStats.valid && content.trim() && (
          <>
            <span className="status-sep">|</span>
            <span className="status-error">格式错误</span>
          </>
        )}
      </div>
      {diffCount !== null && (
        <div className="status-center">
          差异 <strong>{diffCount}</strong> 行
        </div>
      )}
      <div className="status-right">
        {mode !== 'edit' && rightContent.trim() && (
          <>
            <span>{rightStats.keyCount} 个键</span>
            <span className="status-sep">|</span>
            <span>{rightStats.depth} 层</span>
            <span className="status-sep">|</span>
            <span>{formatSize(rightStats.size)}</span>
            <span className="status-sep">|</span>
            <span>{rightStats.lineCount} 行</span>
          </>
        )}
      </div>
    </footer>
  )
}

export default StatusBar
