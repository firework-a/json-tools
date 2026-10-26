import { describe, expect, it } from 'vitest'
import { mergeJson } from './merge'

const parse = (r: { result: string }) => JSON.parse(r.result)

describe('mergeJson', () => {
  it('对象递归合并，同名标量默认取右侧', () => {
    const r = mergeJson('{"a":1,"nested":{"x":1,"y":2}}', '{"b":2,"nested":{"y":9,"z":3}}')
    expect(parse(r)).toEqual({ a: 1, b: 2, nested: { x: 1, y: 9, z: 3 } })
  })

  it('prefer=left 时保留左侧标量', () => {
    const r = mergeJson('{"a":1}', '{"a":2}', { prefer: 'left' })
    expect(parse(r)).toEqual({ a: 1 })
  })

  it('数组三种策略', () => {
    expect(parse(mergeJson('{"t":[1,2]}', '{"t":[2,3]}', { arrayStrategy: 'concat' }))).toEqual({ t: [1, 2, 2, 3] })
    expect(parse(mergeJson('{"t":[1,2]}', '{"t":[2,3]}', { arrayStrategy: 'union' }))).toEqual({ t: [1, 2, 3] })
    expect(parse(mergeJson('{"t":[1,2]}', '{"t":[9]}', { arrayStrategy: 'replace' }))).toEqual({ t: [9] })
  })

  it('类型冲突时按优先级整体取值', () => {
    expect(parse(mergeJson('{"a":{"b":1}}', '{"a":5}', { prefer: 'left' }))).toEqual({ a: { b: 1 } })
    expect(parse(mergeJson('{"a":5}', '{"a":{"b":1}}'))).toEqual({ a: { b: 1 } })
  })

  it('解析错误指明侧别', () => {
    expect(mergeJson('{x', '{}').error).toContain('左侧')
    expect(mergeJson('{}', '{x').error).toContain('右侧')
  })
})
