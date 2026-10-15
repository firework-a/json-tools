// Mock 数据生成：从样例 JSON 结构或 JSON Schema 生成仿真数据
// 支持两种输入：
// 1. 样例 JSON：保留结构，按字段名/类型生成真实感数据（name→人名、email→邮箱…）
// 2. JSON Schema：按 type/properties/items/enum/format 生成

/** 简单伪随机（每次调用随机即可） */
const rand = (n: number) => Math.floor(Math.random() * n)
const pick = <T,>(arr: T[]): T => arr[rand(arr.length)]

const FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Karen', 'Leo']
const LAST_NAMES = ['Chen', 'Wang', 'Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor']
const CITIES = ['Beijing', 'Shanghai', 'New York', 'London', 'Tokyo', 'Singapore', 'Berlin', 'Paris']
const COMPANIES = ['Acme Corp', 'Globex', 'Initech', 'Umbrella', 'Stark Industries', 'Wayne Enterprises']
const WORDS = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'tempor']

const uuid = (): string => {
  const hex = '0123456789abcdef'
  const seg = (len: number) => Array.from({ length: len }, () => hex[rand(16)]).join('')
  return `${seg(8)}-${seg(4)}-${seg(4)}-${seg(4)}-${seg(12)}`
}

const isoDate = (): string => {
  const now = Date.now()
  return new Date(now - rand(365) * 86400000).toISOString()
}

/** 根据字段名猜测语义生成字符串值 */
const mockString = (key: string): string => {
  const k = key.toLowerCase()
  if (/e[-_]?mail/.test(k)) return `${pick(FIRST_NAMES).toLowerCase()}.${pick(LAST_NAMES).toLowerCase()}@example.com`
  if (/name|姓名|昵称/.test(k)) return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
  if (/first/.test(k)) return pick(FIRST_NAMES)
  if (/last|family|surname/.test(k)) return pick(LAST_NAMES)
  if (/city|城市|address|地址/.test(k)) return `${pick(CITIES)} ${pick(WORDS)} st.`
  if (/company|公司|org/.test(k)) return pick(COMPANIES)
  if (/phone|tel|手机|电话/.test(k)) return `+86 1${rand(9) + 1}${String(rand(100000000)).padStart(9, '0')}`
  if (/url|link|website|href/.test(k)) return `https://example.com/${pick(WORDS)}`
  if (/date|time|created|updated|时间|日期/.test(k)) return isoDate()
  if (/id$|_id|^id|uuid/.test(k)) return uuid()
  if (/desc|description|描述|备注|remark|comment/.test(k)) return `${pick(WORDS)} ${pick(WORDS)} ${pick(WORDS)}…`
  if (/color|颜色/.test(k)) return `#${Array.from({ length: 6 }, () => '0123456789abcdef'[rand(16)]).join('')}`
  if (/token|key|secret|hash/.test(k)) return Array.from({ length: 32 }, () => '0123456789abcdef'[rand(16)]).join('')
  return `${pick(WORDS)}-${rand(1000)}`
}

/** 按类型 + 字段名生成 mock 值 */
const mockValue = (key: string, sample: unknown): unknown => {
  if (sample === null) return null
  if (Array.isArray(sample)) {
    // 数组：保留 1~3 个元素
    const n = sample.length > 0 ? 1 + rand(Math.min(3, sample.length)) : 0
    return Array.from({ length: n }, () => (sample.length > 0 ? mockValue(key, sample[0]) : null))
  }
  switch (typeof sample) {
    case 'string':
      return mockString(key)
    case 'number':
      if (Number.isInteger(sample)) return rand(100)
      return Math.round(Math.random() * 10000) / 100
    case 'boolean':
      return Math.random() > 0.5
    case 'object': {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(sample as Record<string, unknown>)) out[k] = mockValue(k, v)
      return out
    }
    default:
      return sample
  }
}

/** 从 JSON Schema 生成一个值 */
const mockFromSchema = (schema: Record<string, unknown>, depth = 0): unknown => {
  if (depth > 6) return null
  if (Array.isArray(schema.enum)) return pick(schema.enum as unknown[])
  if (schema.examples && Array.isArray(schema.examples) && schema.examples.length > 0) return schema.examples[0]
  if (schema.default !== undefined) return schema.default
  const type = Array.isArray(schema.type) ? pick(schema.type as string[]) : schema.type
  switch (type) {
    case 'string': {
      const format = schema.format as string | undefined
      if (format === 'date-time') return isoDate()
      if (format === 'date') return isoDate().slice(0, 10)
      if (format === 'email') return `${pick(FIRST_NAMES).toLowerCase()}@example.com`
      if (format === 'uri') return `https://example.com/${pick(WORDS)}`
      if (format === 'uuid') return uuid()
      if (schema.pattern) return mockString('text')
      return mockString((schema.title as string) ?? (schema.description as string) ?? 'text')
    }
    case 'number':
    case 'integer': {
      const min = typeof schema.minimum === 'number' ? schema.minimum : 0
      const max = typeof schema.maximum === 'number' ? schema.maximum : 100
      const v = min + rand(max - min + 1)
      return type === 'integer' ? v : Math.round(v * 100) / 100
    }
    case 'boolean':
      return Math.random() > 0.5
    case 'array': {
      const items = schema.items as Record<string, unknown> | undefined
      if (!items) return []
      return Array.from({ length: 1 + rand(3) }, () => mockFromSchema(items, depth + 1))
    }
    case 'object': {
      const out: Record<string, unknown> = {}
      const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>
      for (const [k, sub] of Object.entries(props)) out[k] = mockFromSchema(sub, depth + 1)
      return out
    }
    default: {
      // 无 type：看有没有 properties → object，否则字符串
      if (schema.properties) return mockFromSchema({ type: 'object', ...schema }, depth)
      return mockString('text')
    }
  }
}

const isJsonSchema = (parsed: unknown): parsed is Record<string, unknown> =>
  typeof parsed === 'object' && parsed !== null &&
  (('properties' in parsed && typeof (parsed as Record<string, unknown>).properties === 'object') ||
    ('type' in parsed && ['object', 'array', 'string', 'integer', 'number', 'boolean'].includes(String((parsed as Record<string, unknown>).type))))

/**
 * 生成 count 条 mock 数据：
 * - 输入是 JSON Schema → 按 schema 生成 count 条（schema 为 object 时包成数组）
 * - 输入是样例对象/数组 → 保留结构生成 count 条
 */
export const generateMock = (input: string, count = 5): { result: string; error: string | null } => {
  if (!input.trim()) return { result: '', error: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch (e) {
    return { result: '', error: 'JSON 解析错误：' + (e instanceof Error ? e.message : String(e)) }
  }
  const n = Math.max(1, Math.min(100, count))

  try {
    if (isJsonSchema(parsed)) {
      const schema = parsed as Record<string, unknown>
      const isArrSchema = schema.type === 'array'
      const itemSchema = isArrSchema ? (schema.items as Record<string, unknown>) ?? {} : schema
      const records = Array.from({ length: n }, () => mockFromSchema(itemSchema))
      const result = isArrSchema ? records : records[0]
      return { result: JSON.stringify(result, null, 2), error: null }
    }

    // 样例模式：根是数组 → 生成 count 条元素；根是对象 → 直接生成 count 条该对象
    if (Array.isArray(parsed)) {
      const sample = parsed[0] ?? null
      const records = Array.from({ length: n }, () =>
        sample !== null && typeof sample === 'object' && !Array.isArray(sample)
          ? Object.fromEntries(Object.entries(sample as Record<string, unknown>).map(([k, v]) => [k, mockValue(k, v)]))
          : mockValue('value', sample))
      return { result: JSON.stringify(records, null, 2), error: null }
    }

    if (typeof parsed === 'object' && parsed !== null) {
      const records = Array.from({ length: n }, () =>
        Object.fromEntries(Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, mockValue(k, v)])))
      return { result: JSON.stringify(records, null, 2), error: null }
    }

    // 标量样例：包一层数组
    return { result: JSON.stringify(Array.from({ length: n }, () => mockValue('value', parsed)), null, 2), error: null }
  } catch (e) {
    return { result: '', error: '生成失败：' + (e instanceof Error ? e.message : String(e)) }
  }
}
