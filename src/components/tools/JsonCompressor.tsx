import { useState } from 'react'
import Toolbar from '../common/Toolbar'
import JsonEditor from '../common/JsonEditor'
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
  const [value, setValue] = useState('')
  const [mode, setMode] = useState<CompressMode>('compress')
  const [error, setError] = useState<string | null>(null)

  const handleProcess = () => {
    const { result, error: err } = processJson(value, mode)
    if (err) setError(err)
    else {
      setError(null)
      setValue(result)
    }
  }

  const handleClear = () => {
    setValue('')
    setError(null)
  }

  const handleCopy = async () => {
    if (value) await copyToClipboard(value)
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
        <Button onClick={handleCopy}>复制</Button>
        <Button variant="danger" onClick={handleClear}>清空</Button>
      </Toolbar>

      <div className="editor-area">
        <JsonEditor value={value} onChange={(v) => { setValue(v); setError(null) }} />
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  )
}

export default JsonCompressor
