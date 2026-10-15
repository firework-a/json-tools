import { describe, it, expect } from 'vitest'
import { buildTable } from './table'

describe('buildTable', () => {
  it('根数组直接渲染', () => {
    const t = buildTable([{ a: 1 }, { a: 2, b: 'x' }])
    expect(t).not.toBeNull()
    expect(t!.rows).toHaveLength(2)
    expect(t!.columns).toEqual(['a', 'b'])
    expect(t!.title).toBe('根数组')
    expect(t!.path).toEqual([])
  })

  it('自动下钻根下的对象数组字段', () => {
    const t = buildTable({ meta: { total: 2 }, items: [{ id: 1 }] })
    expect(t!.rows).toHaveLength(1)
    expect(t!.title).toBe('root.items')
    expect(t!.path).toEqual(['items'])
  })

  it('非对象数组返回 null', () => {
    expect(buildTable([1, 2, 3])).toBeNull()
    expect(buildTable({ a: 1 })).toBeNull()
    expect(buildTable('text')).toBeNull()
  })

  it('列上限 64', () => {
    const row: Record<string, number> = {}
    for (let i = 0; i < 80; i++) row[`k${i}`] = i
    const t = buildTable([row])
    expect(t!.columns.length).toBe(64)
  })
})
