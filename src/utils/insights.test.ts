import { describe, it, expect } from 'vitest'
import { analyzeJson, formatInsightsReport } from './insights'

describe('analyzeJson', () => {
  it('根对象摘要与字段统计', () => {
    const { result, error } = analyzeJson('{"name":"Alice","age":28,"active":true}')
    expect(error).toBeNull()
    expect(result.summary).toContain('根对象')
    expect(result.fields.map(f => f.path).sort()).toEqual(['active', 'age', 'name'])
  })

  it('null 占比高时给出质量警告', () => {
    const { result } = analyzeJson('{"a":null,"b":null,"c":1}')
    expect(result.issues.some(i => i.message.includes('a'))).toBe(true)
    expect(result.suggestions.some(s => s.includes('null'))).toBe(true)
  })

  it('类型混杂给出警告', () => {
    const { result } = analyzeJson('{"a":1}')
    // 数组里类型混杂
    const { result: r2 } = analyzeJson('{"list":[1,"two",true]}')
    expect(r2.issues.some(i => i.message.includes('类型混杂'))).toBe(true)
    expect(result.fields.length).toBeGreaterThan(0)
  })

  it('深嵌套建议扁平化', () => {
    const deep = { l1: { l2: { l3: { l4: { l5: { l6: { l7: 1 } } } } } } }
    const { result } = analyzeJson(JSON.stringify(deep))
    expect(result.summary).toContain('8 层')
    expect(result.suggestions.some(s => s.includes('扁平化'))).toBe(true)
  })

  it('根数组建议按行处理', () => {
    const { result } = analyzeJson('[{"a":1},{"a":2}]')
    expect(result.suggestions.some(s => s.includes('导出 CSV'))).toBe(true)
  })

  it('非法输入返回错误', () => {
    const { error } = analyzeJson('{a')
    expect(error).toBeTruthy()
  })

  it('空输入返回空结果', () => {
    const { error, result } = analyzeJson('  ')
    expect(error).toBeNull()
    expect(result.summary).toBe('')
  })
})

describe('formatInsightsReport', () => {
  it('报告包含概览/字段/建议区块', () => {
    const { result } = analyzeJson('{"name":"Alice","age":28}')
    const report = formatInsightsReport(result)
    expect(report).toContain('数据概览')
    expect(report).toContain('字段统计')
    expect(report).toContain('建议')
  })
})
