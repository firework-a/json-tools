import { describe, expect, it } from 'vitest'
import { filterPaths, patternToRegex } from './pickPaths'

const parse = (r: { result: string }) => JSON.parse(r.result)

describe('patternToRegex', () => {
  it('[*] 匹配任意下标，* 匹配单层键名', () => {
    expect(patternToRegex('items[*].id').test('items[7].id')).toBe(true)
    expect(patternToRegex('items[*].id').test('items.id')).toBe(false)
    expect(patternToRegex('data.*.id').test('data.user.id')).toBe(true)
    expect(patternToRegex('data.*.id').test('data.user.profile.id')).toBe(false)
    expect(patternToRegex('a.b').test('axb')).toBe(false)
  })
})

describe('filterPaths omit', () => {
  it('简写模式删除任意层级同名键', () => {
    const doc = { __typename: 'Query', data: { user: { id: 1, __typename: 'User', name: 'a' } } }
    const r = filterPaths(JSON.stringify(doc), '__typename')
    expect(parse(r)).toEqual({ data: { user: { id: 1, name: 'a' } } })
    expect(r.hits).toBe(2)
  })

  it('显式路径与数组路径删除', () => {
    const doc = { data: { user: { id: 1, password: 'x' } }, items: [{ id: 1, secret: 's' }, { id: 2, secret: 't' }] }
    const r = filterPaths(JSON.stringify(doc), 'data.user.password, items[*].secret')
    expect(parse(r)).toEqual({ data: { user: { id: 1 } }, items: [{ id: 1 }, { id: 2 }] })
    expect(r.hits).toBe(3)
  })

  it('空模式与非法输入报错', () => {
    expect(filterPaths('{"a":1}', '  ').error).toContain('路径')
    expect(filterPaths('{oops', 'a').error).toBeTruthy()
    expect(filterPaths('42', 'a').error).toContain('对象或数组')
  })
})

describe('filterPaths keep', () => {
  it('只保留命中路径并补齐祖先结构', () => {
    const doc = { total: 2, items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }], meta: { x: 1 } }
    const r = filterPaths(JSON.stringify(doc), 'items[*].id, total', 'keep')
    expect(parse(r)).toEqual({ total: 2, items: [{ id: 1 }, { id: 2 }] })
    expect(r.hits).toBe(3)
  })

  it('整块保留：命中父路径时子树原样留下', () => {
    const doc = { a: { deep: { x: 1 } }, b: 2 }
    expect(parse(filterPaths(JSON.stringify(doc), 'a', 'keep'))).toEqual({ a: { deep: { x: 1 } } })
  })

  it('全部未命中时返回空容器', () => {
    expect(parse(filterPaths('{"a":1}', 'zzz', 'keep'))).toEqual({})
    expect(parse(filterPaths('[{"a":1}]', 'zzz', 'keep'))).toEqual([])
  })
})
