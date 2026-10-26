import { describe, expect, it } from 'vitest'
import { collectPaths, formatPathReport } from './paths'

const DOC = JSON.stringify({
  items: [
    { id: 1, name: 'a', tag: null },
    { id: '2', name: 'b' },
  ],
  total: 2,
})

const byPath = (stats: ReturnType<typeof collectPaths>['stats'], path: string) =>
  stats.find(s => s.path === path)

describe('collectPaths', () => {
  const { stats, error } = collectPaths(DOC)

  it('解析成功并记录根路径', () => {
    expect(error).toBeNull()
    expect(byPath(stats, '(根)')?.count).toBe(1)
    expect(byPath(stats, '(根)')?.types).toEqual({ object: 1 })
  })

  it('数组折叠为 [*]，次数按元素累计', () => {
    expect(byPath(stats, 'items[*]')?.count).toBe(2)
    expect(stats.some(s => s.path === 'items[0]')).toBe(false)
  })

  it('覆盖率相对父级计算', () => {
    expect(byPath(stats, 'items[*].name')?.coverage).toBe(1)
    expect(byPath(stats, 'items[*].tag')?.coverage).toBe(0.5)
    expect(byPath(stats, 'total')?.coverage).toBe(1)
  })

  it('类型混杂与 null 计数', () => {
    expect(byPath(stats, 'items[*].id')?.types).toEqual({ number: 1, string: 1 })
    expect(byPath(stats, 'items[*].tag')?.nulls).toBe(1)
    expect(byPath(stats, 'items[*].tag')?.types).toEqual({ null: 1 })
  })

  it('示例值取首次出现并做类型摘要', () => {
    expect(byPath(stats, 'items[*].name')?.sample).toBe('a')
    expect(byPath(stats, 'items')?.sample).toBe('array[2]')
    expect(byPath(stats, 'items[*]')?.sample).toBe('object{3}')
  })

  it('非法 JSON 返回错误', () => {
    const r = collectPaths('{oops')
    expect(r.error).toBeTruthy()
    expect(r.stats).toEqual([])
  })

  it('报告为 Markdown 表格且转义竖线', () => {
    const text = formatPathReport(collectPaths(DOC).stats)
    expect(text).toContain('共 7 个字段路径')
    expect(text.split('\n')[2]).toBe('| 路径 | 次数 | 覆盖率 | 类型分布 | null | 示例 |')
    const pipe = formatPathReport([{ path: 'a|b', count: 1, coverage: 1, types: { string: 1 }, nulls: 0, sample: 'x' }])
    expect(pipe).toContain('a\\|b')
  })
})
