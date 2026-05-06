import { useState } from 'react'
import Toolbar from '../common/Toolbar'
import JsonEditor from '../common/JsonEditor'
import ErrorMessage from '../common/ErrorMessage'
import Button from '../common/Button'
import { processJson, type CompressMode } from '../../utils/jsonCompressor'
import { copyToClipboard } from '../../utils/json'

const modeLabels: Record<CompressMode, string> = {
  'compress': '压缩',
  'escape': '转义',
  'unescape': '解转义',
  'base64-encode': 'Base64 编码',
  'base64-decode': 'Base64 解码',
}

function JsonCompressor() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<CompressMode>('compress')
  const [error, setError] = useState<string | null>(null)

  const handleProcess = () => {
    const { result, error: err } = processJson(input, mode)
    setOutput(result)
    setError(err)
  }

  const handleClear = () => {
    setInput('')
    setOutput('')
    setError(null)
  }

  const handleCopy = async () => {
    await copyToClipboard(output)
  }

  return (
    <div className="tool-panel">
      <Toolbar title="JSON 压缩/转义">
        <select 
          className="mode-select" 
          value={mode} 
          onChange={(e) => setMode(e.target.value as CompressMode)}
        >
          {Object.entries(modeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <Button variant="primary" onClick={handleProcess}>执行</Button>
        <Button onClick={handleCopy}>复制结果</Button>
        <Button variant="danger" onClick={handleClear}>清空</Button>
      </Toolbar>

      <div className="editor-area">
        <JsonEditor
          value={output || input}
          onChange={(value) => {
            setInput(value)
            setOutput('')
            setError(null)
          }}
        />
        <ErrorMessage message={error} />
      </div>
    </div>
  )
}

export default JsonCompressor
