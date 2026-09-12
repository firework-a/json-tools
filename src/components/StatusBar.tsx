import { useMemo } from 'react'
import { useAppStore } from '../store'
import { getJsonStats } from '../utils/json'
import { computeDiff } from '../utils/jsonDiffer'
import UpdateButton from './UpdateButton'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function StatusBar() {
  const { content, rightContent, mode, fileName } = useAppStore()
  // 统计/diff 属重计算，防抖后再算，避免大文件每次按键全量 JSON.parse
  const debouncedContent = useDebouncedValue(content, 250)
  const debouncedRight = useDebouncedValue(rightContent, 250)

  const leftStats = useMemo(() => getJsonStats(debouncedContent), [debouncedContent])
  const rightStats = useMemo(() => getJsonStats(debouncedRight), [debouncedRight])

  // 对比模式：用行级 diff 统计真实变更行数（增+删）
  const diffCount = useMemo(() => {
    if (mode !== 'diff') return null
    if (!debouncedContent.trim() && !debouncedRight.trim()) return null
    const d = computeDiff(debouncedContent, debouncedRight)
    const total = d.leftRemoved.size + d.rightAdded.size
    return total > 0 ? total : null
  }, [mode, debouncedContent, debouncedRight])

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
        <UpdateButton />
      </div>
    </footer>
  )
}

export default StatusBar
