import { useState } from 'react'
import Toolbar from '../common/Toolbar'
import JsonEditor from '../common/JsonEditor'
import Button from '../common/Button'
import { formatJson, compressJson, copyToClipboard } from '../../utils/json'

function JsonFormatter() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleFormat = () => {
    const { result, error: err } = formatJson(value)
    if (err) setError(err)
    else {
      setError(null)
      setValue(result)
    }
  }

  const handleCompress = () => {
    const { result, error: err } = compressJson(value)
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
      <Toolbar title="JSON 格式化">
        <Button variant="primary" onClick={handleFormat}>格式化</Button>
        <Button onClick={handleCompress}>压缩</Button>
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

export default JsonFormatter
