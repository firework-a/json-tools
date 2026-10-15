import { describe, it, expect } from 'vitest'
import { formatJson, compressJson, tryParseJson, repairJsonDeep, detectFormat } from './json'

describe('tryParseJson', () => {
  it('解析普通 JSON', () => {
    const { parsed, error } = tryParseJson('{"a":1}')
    expect(error).toBeNull()
    expect(parsed).toEqual({ a: 1 })
  })

  it('修复注释 / 单引号 / 尾逗号 / 无引号键', () => {
    const { parsed, error } = tryParseJson("{ // comment\n  a: 1, 'b': [1, 2,],\n}")
    expect(error).toBeNull()
    expect(parsed).toEqual({ a: 1, b: [1, 2] })
  })

  it('兼容伪字面量 True/None', () => {
    const { parsed, error } = tryParseJson('{"a": True, "b": None}')
    expect(error).toBeNull()
    expect(parsed).toEqual({ a: true, b: null })
  })
})

describe('formatJson / compressJson', () => {
  it('美化输出缩进 JSON', () => {
    const { result, error } = formatJson('{"a":1,"b":[1,2]}')
    expect(error).toBeNull()
    expect(result).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}')
  })

  it('压缩为单行', () => {
    const { result, error } = compressJson('{\n  "a": 1\n}')
    expect(error).toBeNull()
    expect(result).toBe('{"a":1}')
  })

  it('非法输入返回错误', () => {
    const { error } = formatJson('{a')
    expect(error).toBeTruthy()
  })
})

describe('repairJsonDeep', () => {
  it('合法输入标记 valid', () => {
    const r = repairJsonDeep('{"a":1}')
    expect(r.valid).toBe(true)
    expect(r.changed).toBe(false)
  })

  it('修复单引号与尾逗号', () => {
    const r = repairJsonDeep("{ a: 1, }")
    expect(r.error).toBeNull()
    expect(r.valid).toBe(false)
    expect(JSON.parse(r.result)).toEqual({ a: 1 })
  })

  it('截断 payload 由 jsonrepair 兜底修复', () => {
    const r = repairJsonDeep('{"a": 1, "b": [1, 2')
    expect(r.error).toBeNull()
    expect(JSON.parse(r.result)).toEqual({ a: 1, b: [1, 2] })
  })
})

describe('detectFormat', () => {
  it('识别 YAML', () => {
    expect(detectFormat('a: 1\nb: 2')).toBe('yaml')
  })
  it('识别 XML', () => {
    expect(detectFormat('<root><a>1</a></root>')).toBe('xml')
  })
  it('普通 JSON 不误判', () => {
    expect(detectFormat('{"a": 1}')).not.toBe('yaml')
    expect(detectFormat('{"a": 1}')).not.toBe('xml')
  })
})
