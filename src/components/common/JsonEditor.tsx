import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'

interface JsonEditorProps {
  value: string
  onChange?: (value: string) => void
  editable?: boolean
  className?: string
}

function JsonEditor({ value, onChange, editable = true, className }: JsonEditorProps) {
  return (
    <div className={`json-editor ${className || ''}`}>
      <CodeMirror
        value={value}
        extensions={[json()]}
        theme={vscodeDark}
        onChange={onChange}
        editable={editable}
        style={{ height: '100%' }}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
        }}
      />
    </div>
  )
}

export default JsonEditor
