import { useState, useEffect, useMemo } from 'react'
import DiffEditor from '../common/DiffEditor'
import Toolbar from '../common/Toolbar'
import Button from '../common/Button'
import { JsonDiffer } from '../../utils/jsonDiffer'

function JsonComparator() {
  const [leftJson, setLeftJson] = useState('')
  const [rightJson, setRightJson] = useState('')
  const [leftDiffLines, setLeftDiffLines] = useState<Set<number>>(new Set())
  const [rightDiffLines, setRightDiffLines] = useState<Set<number>>(new Set())
  const [stats, setStats] = useState({ added: 0, deleted: 0 })
  const [leftError, setLeftError] = useState<string | null>(null)
  const [rightError, setRightError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      // 先验证两侧 JSON 是否合法
      let leftValid = true
      let rightValid = true
      setLeftError(null)
      setRightError(null)

      if (leftJson.trim()) {
        try {
          JSON.parse(leftJson)
        } catch {
          leftValid = false
          setLeftError('JSON 1 格式错误')
        }
      }
      if (rightJson.trim()) {
        try {
          JSON.parse(rightJson)
        } catch {
          rightValid = false
          setRightError('JSON 2 格式错误')
        }
      }

      if (!leftValid || !rightValid) {
        setLeftDiffLines(new Set())
        setRightDiffLines(new Set())
        setStats({ added: 0, deleted: 0 })
        return
      }

      const result = JsonDiffer.compare(leftJson, rightJson)
      setLeftDiffLines(result.leftDiffLines)
      setRightDiffLines(result.rightDiffLines)
      setStats(result.stats)
    }, 300)

    return () => clearTimeout(timer)
  }, [leftJson, rightJson])

  const clearAll = () => {
    setLeftJson('')
    setRightJson('')
    setLeftDiffLines(new Set())
    setRightDiffLines(new Set())
    setStats({ added: 0, deleted: 0 })
    setLeftError(null)
    setRightError(null)
  }

  const hasDiff = stats.added > 0 || stats.deleted > 0
  const hasContent = leftJson.trim() || rightJson.trim()
  const summary = useMemo(() => JsonDiffer.generateSummary(stats), [stats])

  return (
    <div className="tool-panel">
      <Toolbar title="JSON 对比">
        {hasDiff && <span className="diff-badge">{stats.added + stats.deleted} 处差异</span>}
        <Button variant="danger" onClick={clearAll}>清空</Button>
      </Toolbar>

      {hasContent && !leftError && !rightError && (
        <div className={`diff-summary ${hasDiff ? 'has-diff' : 'no-diff'}`}>
          <span className="summary-text">{summary}</span>
        </div>
      )}

      <div className="compare-area">
        <div className="compare-editor">
          <div className="editor-label">
            <span>JSON 1</span>
            {leftError && <span className="editor-error">{leftError}</span>}
          </div>
          <DiffEditor
            value={leftJson}
            onChange={setLeftJson}
            diffLines={{ deleted: leftDiffLines }}
            editorId="left"
          />
        </div>
        <div className="compare-editor">
          <div className="editor-label">
            <span>JSON 2</span>
            {rightError && <span className="editor-error">{rightError}</span>}
          </div>
          <DiffEditor
            value={rightJson}
            onChange={setRightJson}
            diffLines={{ added: rightDiffLines }}
            editorId="right"
          />
        </div>
      </div>
    </div>
  )
}

export default JsonComparator
