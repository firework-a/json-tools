import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { diffLines } from 'diff'

interface Difference {
  value: string
  added?: boolean
  removed?: boolean
}

function JsonComparator() {
  const [leftJson, setLeftJson] = useState('')
  const [rightJson, setRightJson] = useState('')
  const [differences, setDifferences] = useState<Difference[]>([])

  const compareJson = () => {
    try {
      const leftParsed = JSON.parse(leftJson || '{}')
      const rightParsed = JSON.parse(rightJson || '{}')
      
      const leftFormatted = JSON.stringify(leftParsed, null, 2)
      const rightFormatted = JSON.stringify(rightParsed, null, 2)
      
      const diff = diffLines(leftFormatted, rightFormatted)
      setDifferences(diff)
    } catch (err) {
      console.error('JSON 解析错误:', err)
    }
  }

  const clearAll = () => {
    setLeftJson('')
    setRightJson('')
    setDifferences([])
  }

  return (
    <div className="tool-panel">
      <div className="panel-header">
        <h3>JSON 对比</h3>
        <div className="panel-actions">
          <button className="btn btn-primary" onClick={compareJson}>对比</button>
          <button className="btn btn-danger" onClick={clearAll}>清空</button>
        </div>
      </div>

      <div className="panel-body">
        <div className="editor-container compare-container">
          <div className="editor-section">
            <div className="editor-label">JSON 1</div>
            <CodeMirror
              value={leftJson}
              height="400px"
              extensions={[json()]}
              theme={vscodeDark}
              onChange={setLeftJson}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
              }}
            />
          </div>

          <div className="editor-section">
            <div className="editor-label">JSON 2</div>
            <CodeMirror
              value={rightJson}
              height="400px"
              extensions={[json()]}
              theme={vscodeDark}
              onChange={setRightJson}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
              }}
            />
          </div>
        </div>

        {differences.length > 0 && (
          <div className="diff-result">
            <div className="editor-label">差异结果</div>
            <div className="diff-content">
              {differences.map((diff, index) => (
                <div
                  key={index}
                  className={`diff-line ${diff.added ? 'added' : diff.removed ? 'removed' : ''}`}
                >
                  {diff.added && <span className="diff-marker">+</span>}
                  {diff.removed && <span className="diff-marker">-</span>}
                  {!diff.added && !diff.removed && <span className="diff-marker"> </span>}
                  <pre>{diff.value}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default JsonComparator
