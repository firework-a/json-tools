import { describe, it, expect } from 'vitest'
import { convertNdjson } from './ndjson'
import { generateMock } from './mockData'

describe('convertNdjson', () => {
  it('NDJSON → JSON 数组', () => {
    const { result, error } = convertNdjson('{"a":1}\n{"a":2}', true)
    expect(error).toBeNull()
    expect(JSON.parse(result!)).toEqual([{ a: 1 }, { a: 2 }])
  })

  it('JSON 数组 → NDJSON', () => {
    const { result, error } = convertNdjson('[{"a":1},{"a":2}]', false)
    expect(error).toBeNull()
    expect(result).toBe('{"a":1}\n{"a":2}')
  })

  it('单对象 → 单行 NDJSON', () => {
    const { result, error } = convertNdjson('{"a":1}', false)
    expect(error).toBeNull()
    expect(result).toBe('{"a":1}')
  })

  it('坏行精确定位报错', () => {
    const { error } = convertNdjson('{"a":1}\nnot json', true)
    expect(error).toContain('2')
  })

  it('跳过空行与注释行', () => {
    const { result, error } = convertNdjson('{"a":1}\n\n// comment\n{"a":2}', true)
    expect(error).toBeNull()
    expect(JSON.parse(result!)).toEqual([{ a: 1 }, { a: 2 }])
  })
})

describe('generateMock', () => {
  it('样例模式：保留结构生成 count 条', () => {
    const sample = JSON.stringify({ id: 1, name: 'x', active: true })
    const { result, error } = generateMock(sample, 3)
    expect(error).toBeNull()
    const arr = JSON.parse(result!)
    expect(arr).toHaveLength(3)
    for (const item of arr) {
      expect(Object.keys(item).sort()).toEqual(['active', 'id', 'name'])
      expect(typeof item.id).toBe('number')
      expect(typeof item.active).toBe('boolean')
    }
  })

  it('数组样例：生成元素数组', () => {
    const sample = JSON.stringify([{ a: 1 }])
    const { result, error } = generateMock(sample, 2)
    expect(error).toBeNull()
    expect(JSON.parse(result!)).toHaveLength(2)
  })

  it('Schema 模式：按 type/enum/integer 范围生成', () => {
    const schema = JSON.stringify({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer', minimum: 18, maximum: 60 },
        role: { enum: ['admin', 'user'] },
        email: { type: 'string', format: 'email' },
      },
    })
    const { result, error } = generateMock(schema, 1)
    expect(error).toBeNull()
    const obj = JSON.parse(result!)
    expect(typeof obj.name).toBe('string')
    expect(obj.age).toBeGreaterThanOrEqual(18)
    expect(obj.age).toBeLessThanOrEqual(60)
    expect(['admin', 'user']).toContain(obj.role)
    expect(obj.email).toContain('@')
  })

  it('条数限制 1~100', () => {
    const { result } = generateMock('[{"a":1}]', 500)
    expect(JSON.parse(result!)).toHaveLength(100)
  })
})
