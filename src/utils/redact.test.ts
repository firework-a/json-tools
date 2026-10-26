import { describe, expect, it } from 'vitest'
import { redactJson } from './redact'

const parse = (r: { result: string }) => JSON.parse(r.result)

describe('redactJson', () => {
  it('键名命中时整值打码（含对象/数组值）', () => {
    const r = redactJson('{"password":"abc","token":{"a":1},"name":"ok"}')
    const parsed = parse(r)
    expect(parsed.password).toBe('***')
    expect(parsed.token).toBe('***')
    expect(parsed.name).toBe('ok')
    expect(r.hits.map(h => h.path)).toEqual(['password', 'token'])
  })

  it('按值格式识别手机号/身份证/邮箱/JWT/银行卡', () => {
    const r = redactJson(JSON.stringify({
      phone: '13812345678',
      id: '110101199003074571',
      mail: 'user@example.com',
      jwt: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghij1234567890',
      card: '6222021234567890123',
    }))
    const parsed = parse(r)
    expect(parsed.phone).toBe('13*******78')
    expect(parsed.id).not.toContain('1990')
    expect(parsed.mail).toBe('us' + '*'.repeat(12) + 'om')
    expect(parsed.jwt).toMatch(/^\w\w\*+\w\w$/)
    expect(parsed.card).not.toContain('1234567')
    expect(r.hits.map(h => h.rule)).toEqual(['手机号', '身份证号', '邮箱', 'JWT', '银行卡号'])
  })

  it('keepEdges=false 整值星号化，长度对齐', () => {
    const r = redactJson('{"phone":"13812345678"}', { keepEdges: false })
    expect(parse(r).phone).toBe('*'.repeat(11))
  })

  it('普通值不误伤，IPv4 命中', () => {
    const r = redactJson(JSON.stringify({ ip: '192.168.1.10', note: 'hello world', n: 42 }))
    const parsed = parse(r)
    expect(parsed.ip).toBe('19********10')
    expect(parsed.note).toBe('hello world')
    expect(parsed.n).toBe(42)
  })

  it('extraKeyPattern 追加自定义键名规则，非法正则被忽略', () => {
    expect(parse(redactJson('{"nick":"abc123"}', { extraKeyPattern: 'nick' })).nick).toBe('******')
    expect(parse(redactJson('{"nick":"abc123"}', { extraKeyPattern: '(' })).nick).toBe('abc123')
  })

  it('按词匹配键名：驼峰命中、形近词不误伤', () => {
    const parsed = parse(redactJson(JSON.stringify({
      userPassword: 'hunter2!!',
      accessToken: 'abc123def456',
      authors: ['firework-a'],
      tokenizer: 'gpt2',
      passenger: '张三',
    })))
    expect(parsed.userPassword).toBe('*'.repeat('hunter2!!'.length))
    expect(parsed.accessToken).toBe('*'.repeat('abc123def456'.length))
    expect(parsed.authors).toEqual(['firework-a'])
    expect(parsed.tokenizer).toBe('gpt2')
    expect(parsed.passenger).toBe('张三')
  })

  it('非法 JSON 报错', () => {
    expect(redactJson('{a').error).toBeTruthy()
  })
})
