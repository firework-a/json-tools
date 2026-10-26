import { describe, expect, it } from 'vitest'
import { humanizeTimestamps, toEpochTimestamps } from './timestamps'

describe('humanizeTimestamps', () => {
  it('秒与毫秒时间戳转 ISO，并记录命中路径', () => {
    const r = humanizeTimestamps('{"createdAt":1700000000,"log":{"ms":1700000000000},"name":"x"}')
    const parsed = JSON.parse(r.result)
    expect(parsed.createdAt).toBe('2023-11-14T22:13:20.000Z')
    expect(parsed.log.ms).toBe('2023-11-14T22:13:20.000Z')
    expect(parsed.name).toBe('x')
    expect(r.hits.map(h => h.path)).toEqual(['createdAt', 'log.ms'])
  })

  it('数字字符串同样识别，越界数值不动', () => {
    const r = humanizeTimestamps('{"a":"1700000000","b":123,"c":170000000000000}')
    const parsed = JSON.parse(r.result)
    expect(parsed.a).toBe('2023-11-14T22:13:20.000Z')
    expect(parsed.b).toBe(123)
    expect(parsed.c).toBe(170000000000000)
  })

  it('local 格式输出可读时间', () => {
    const r = humanizeTimestamps('[1700000000]', { format: 'local' })
    expect(JSON.parse(r.result)[0]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  it('数组下标路径与根标量错误', () => {
    expect(humanizeTimestamps('[[1700000000]]').hits[0].path).toBe('[0][0]')
    expect(humanizeTimestamps('42').error).toContain('对象或数组')
  })
})

describe('toEpochTimestamps', () => {
  it('ISO 字符串转毫秒，unit=s 转秒', () => {
    expect(JSON.parse(toEpochTimestamps('{"d":"2023-11-14T22:13:20.000Z"}').result).d).toBe(1700000000000)
    expect(JSON.parse(toEpochTimestamps('{"d":"2023-11-14T22:13:20.000Z"}', { unit: 's' }).result).d).toBe(1700000000)
  })

  it('非日期字符串保持不变', () => {
    const r = toEpochTimestamps('{"a":"hello","b":"2023-11-14"}')
    const parsed = JSON.parse(r.result)
    expect(parsed.a).toBe('hello')
    expect(typeof parsed.b).toBe('number')
  })

  it('本地可读格式可回环', () => {
    const human = humanizeTimestamps('{"t":1700000000}', { format: 'local' })
    const back = toEpochTimestamps(human.result, { unit: 's' })
    expect(JSON.parse(back.result).t).toBe(1700000000)
  })
})
