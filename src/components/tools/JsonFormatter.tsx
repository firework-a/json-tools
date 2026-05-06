import { useState } from 'react'
import Toolbar from '../common/Toolbar'
import JsonEditor from '../common/JsonEditor'
import ErrorMessage from '../common/ErrorMessage'
import Button from '../common/Button'
import { formatJson, compressJson, copyToClipboard } from '../../utils/json'

function JsonFormatter() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleFormat = () => {
    const { result, error: err } = formatJson(input)
    setOutput(result)
    setError(err)
  }

  const handleCompress = () => {
    const { result, error: err } = compressJson(input)
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
      <Toolbar title="JSON 格式化">
        <Button variant="primary" onClick={handleFormat}>格式化</Button>
        <Button onClick={handleCompress}>压缩</Button>
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

export default JsonFormatter
