export type CompressMode = 'compress' | 'escape' | 'unescape' | 'base64-encode' | 'base64-decode'

export const processJson = (
  input: string, 
  mode: CompressMode
): { result: string; error: string | null } => {
  try {
    switch (mode) {
      case 'compress': {
        const parsed = JSON.parse(input)
        return { result: JSON.stringify(parsed), error: null }
      }
      case 'escape': {
        const parsed = JSON.parse(input)
        const jsonStr = JSON.stringify(parsed)
        return { 
          result: jsonStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"'), 
          error: null 
        }
      }
      case 'unescape': {
        const unescaped = input.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
        const parsed = JSON.parse(unescaped)
        return { result: JSON.stringify(parsed, null, 2), error: null }
      }
      case 'base64-encode': {
        const parsed = JSON.parse(input)
        const jsonStr = JSON.stringify(parsed)
        return { result: btoa(encodeURIComponent(jsonStr)), error: null }
      }
      case 'base64-decode': {
        const decoded = decodeURIComponent(atob(input))
        const parsed = JSON.parse(decoded)
        return { result: JSON.stringify(parsed, null, 2), error: null }
      }
      default:
        return { result: '', error: '未知模式' }
    }
  } catch (err) {
    return { 
      result: '', 
      error: err instanceof Error ? err.message : '处理错误' 
    }
  }
}
