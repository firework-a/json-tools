export const formatJson = (input: string): { result: string; error: string | null } => {
  try {
    if (!input.trim()) {
      return { result: '', error: null }
    }
    const parsed = JSON.parse(input)
    return { result: JSON.stringify(parsed, null, 2), error: null }
  } catch (err) {
    return { 
      result: '', 
      error: err instanceof Error ? err.message : 'JSON 解析错误' 
    }
  }
}

export const compressJson = (input: string): { result: string; error: string | null } => {
  try {
    if (!input.trim()) {
      return { result: '', error: null }
    }
    const parsed = JSON.parse(input)
    return { result: JSON.stringify(parsed), error: null }
  } catch (err) {
    return { 
      result: '', 
      error: err instanceof Error ? err.message : 'JSON 解析错误' 
    }
  }
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (text) {
      await navigator.clipboard.writeText(text)
      return true
    }
    return false
  } catch (err) {
    console.error('复制失败:', err)
    return false
  }
}
