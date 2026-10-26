import { describe, expect, it } from 'vitest'
import { sortByField } from './sortByField'

const ids = (json: string) => JSON.parse(json).map((r: { id: number }) => r.id)

describe('sortByField', () => {
  it('根数组按数值字段升序', () => {
    const { result, error, hits } = sortByField('[{"id":3},{"id":1},{"id":2}]', 'id')
    expect(error).toBeNull()
    expect(ids(result)).toEqual([1, 2, 3])
    expect(hits).toBe(3)
  })

  it('降序', () => {
    const { result } = sortByField('[{"id":1},{"id":3},{"id":2}]', 'id', { order: 'desc' })
    expect(ids(result)).toEqual([3, 2, 1])
  })

  it('保持外层信封结构不变', () => {
    const { result } = sortByField('{"total":2,"items":[{"n":2},{"n":1}]}', 'n')
    const doc = JSON.parse(result)
    expect(doc.total).toBe(2)
    expect(doc.items.map((r: { n: number }) => r.n)).toEqual([1, 2])
  })

  it('字符串按自然序（item2 在 item10 前）', () => {
    const { result } = sortByField('[{"k":"item10"},{"k":"item2"}]', 'k')
    expect(JSON.parse(result).map((r: { k: string }) => r.k)).toEqual(['item2', 'item10'])
  })

  it('日期字符串按时间先后', () => {
    const { result } = sortByField('[{"at":"2026-03-01"},{"at":"2026-01-15"},{"at":"2026-02-20"}]', 'at')
    expect(JSON.parse(result).map((r: { at: string }) => r.at))
      .toEqual(['2026-01-15', '2026-02-20', '2026-03-01'])
  })

  it('null 与缺失字段同等对待，默认排在末尾（两种方向都在末尾）', () => {
    const asc = sortByField('[{"n":null},{"n":2},{"m":1}]', 'n').result
    expect(JSON.parse(asc)).toEqual([{ n: 2 }, { n: null }, { m: 1 }])
    const desc = sortByField('[{"n":null},{"n":2},{"n":9}]', 'n', { order: 'desc' }).result
    expect(JSON.parse(desc).map((r: { n?: number }) => r.n)).toEqual([9, 2, null])
    const first = sortByField('[{"n":null},{"n":2},{"n":9}]', 'n', { missing: 'first' }).result
    expect(JSON.parse(first).map((r: { n?: number }) => r.n)).toEqual([null, 2, 9])
  })

  it('点号路径与数组下标', () => {
    const nested = sortByField('[{"user":{"name":"b"}},{"user":{"name":"a"}}]', 'user.name').result
    expect(JSON.parse(nested).map((r: { user: { name: string } }) => r.user.name)).toEqual(['a', 'b'])
    const byIndex = sortByField('[{"t":["z"]},{"t":["a"]}]', 't.0').result
    expect(JSON.parse(byIndex).map((r: { t: string[] }) => r.t[0])).toEqual(['a', 'z'])
  })

  it('字段留空时直接排序标量数组', () => {
    const { result } = sortByField('[3,1,2]', '')
    expect(JSON.parse(result)).toEqual([1, 2, 3])
    const { result: strs } = sortByField('["b","a"]', '')
    expect(JSON.parse(strs)).toEqual(['a', 'b'])
  })

  it('同值保持原顺序（稳定排序）', () => {
    const { result } = sortByField('[{"g":1,"i":"a"},{"g":1,"i":"b"},{"g":0,"i":"c"}]', 'g')
    expect(JSON.parse(result).map((r: { i: string }) => r.i)).toEqual(['c', 'a', 'b'])
  })

  it('错误分支：非法 JSON / 找不到数组 / 字段不存在 / 空数组', () => {
    expect(sortByField('[', 'id').error).toBeTruthy()
    expect(sortByField('{"a":1}', 'id').error).toContain('未找到对象数组')
    expect(sortByField('[{"id":1}]', 'nope').error).toContain('没有元素含字段')
    expect(sortByField('[]', 'id').error).toContain('数组为空')
    expect(sortByField('[{"id":1}]', '').error).toContain('请填写排序字段')
  })
})
