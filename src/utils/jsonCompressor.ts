export type CompressMode = 'compress' | 'escape' | 'unescape' | 'base64-encode' | 'base64-decode'

export const processJson = (
  input: string,
  mode: CompressMode
): { result: string; error: string | null } => {
  try {
    const text = input.trim()
    switch (mode) {
      case 'compress': {
        const parsed = JSON.parse(text)
        return { result: JSON.stringify(parsed), error: null }
      }
      case 'escape': {
        // 把 JSON 内容转成可嵌入字符串的形式（引号和反斜杠被转义）
        const parsed = JSON.parse(text)
        const jsonStr = JSON.stringify(parsed)
        // JSON.stringify 已经生成合法 JSON，再对其进行一次 stringify 得到转义版本，去掉外层引号
        return { result: JSON.stringify(jsonStr).slice(1, -1), error: null }
      }
      case 'unescape': {
        // 把转义后的字符串还原
        // 用 JSON.parse 包住字符串可自动处理所有转义
        const unescaped = JSON.parse('"' + text.replace(/"/g, '\\"') + '"')
        // 再尝试 parse 成 JSON 并格式化
        const parsed = JSON.parse(unescaped)
        return { result: JSON.stringify(parsed, null, 2), error: null }
      }
      case 'base64-encode': {
        const parsed = JSON.parse(text)
        const jsonStr = JSON.stringify(parsed)
        return { result: btoa(unescape(encodeURIComponent(jsonStr))), error: null }
      }
      case 'base64-decode': {
        const decoded = decodeURIComponent(escape(atob(text)))
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
