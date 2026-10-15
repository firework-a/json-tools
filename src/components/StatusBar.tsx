import { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '../store'
import { getJsonStats, repairJsonDeep } from '../utils/json'
import { computeDiff } from '../utils/jsonDiffer'
import { onEditorCursor } from '../editorRegistry'
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

  // 主编辑器光标位置（行列），状态栏显示
  const [cursor, setCursor] = useState<{ line: number; column: number } | null>(null)
  useEffect(() => {
    const off = onEditorCursor((line, column) => setCursor({ line, column }))
    return off
  }, [])

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
        {cursor && (
          <>
            <span className="status-sep">|</span>
            <span>Ln {cursor.line}, Col {cursor.column}</span>
          </>
        )}
        {!leftStats.valid && content.trim() && (
          <>
            <span className="status-sep">|</span>
            <button
              className="status-error status-fix"
              title="点击一键修复 JSON"
              onClick={() => {
                const st = useAppStore.getState()
                const { result, error, valid, changed } = repairJsonDeep(st.content)
                if (valid) { st.showToast('JSON 本身合法，无需修复'); return }
                if (error) { st.showToast(error); return }
                st.setContent(result)
                st.setEditorLanguage('json')
                st.showToast(changed ? '已修复为合法 JSON' : 'JSON 内容未变化')
              }}
            >格式错误 · 一键修复</button>
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
