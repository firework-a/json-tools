// 从 JSON 推断 JSON Schema (draft-07)
const getType = (v: any): string => {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  const t = typeof v
  if (t === 'number') return Number.isInteger(v) ? 'integer' : 'number'
  return t
}

const infer = (value: any): any => {
  const type = getType(value)
  const schema: any = { type }
  if (type === 'object') {
    const properties: Record<string, any> = {}
    const required: string[] = []
    for (const [k, v] of Object.entries(value)) {
      properties[k] = infer(v)
      required.push(k)
    }
    schema.properties = properties
    if (required.length) schema.required = required
  } else if (type === 'array') {
    if (value.length === 0) {
      schema.items = {}
    } else {
      // 取第一项的 schema（简化处理）
      schema.items = infer(value[0])
    }
  } else if (type === 'string') {
    // 不推断 format，避免过度猜测
  }
  return schema
}

export const jsonToSchema = (input: string): { result: string; error: string | null } => {
  try {
    const data = JSON.parse(input)
    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      ...infer(data),
    }
    return { result: JSON.stringify(schema, null, 2), error: null }
  } catch (err) {
    return { result: '', error: err instanceof Error ? err.message : '生成失败' }
  }
}
