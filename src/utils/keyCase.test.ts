import { describe, expect, it } from 'vitest'
import { convertKeys, splitWords, toKeyCase } from './keyCase'

describe('splitWords / toKeyCase', () => {
  it('拆词覆盖驼峰、缩写与分隔符', () => {
    expect(splitWords('XMLHttpRequest')).toEqual(['XML', 'Http', 'Request'])
    expect(splitWords('user_id')).toEqual(['user', 'id'])
    expect(splitWords('user-name')).toEqual(['user', 'name'])
    expect(splitWords('userID')).toEqual(['user', 'ID'])
  })

  it('四种风格互转', () => {
    expect(toKeyCase('created_at_time', 'camel')).toBe('createdAtTime')
    expect(toKeyCase('createdAtTime', 'snake')).toBe('created_at_time')
    expect(toKeyCase('createdAt', 'kebab')).toBe('created-at')
    expect(toKeyCase('user_id', 'pascal')).toBe('UserId')
  })
})

describe('convertKeys', () => {
  it('递归转换嵌套对象与数组内元素', () => {
    const { result, error } = convertKeys('{"user_info":{"first_name":"a","tags":[{"tag_name":"t"}]}}', 'camel')
    expect(error).toBeNull()
    expect(JSON.parse(result)).toEqual({ userInfo: { firstName: 'a', tags: [{ tagName: 't' }] } })
  })

  it('撞名时拒绝转换避免丢数据', () => {
    const { result, error } = convertKeys('{"a_b":1,"aB":2}', 'camel')
    expect(result).toBe('')
    expect(error).toContain('冲突')
  })

  it('非法 JSON 与标量根给出错误', () => {
    expect(convertKeys('{a', 'camel').error).toBeTruthy()
    expect(convertKeys('123', 'camel').error).toContain('对象或数组')
  })
})
