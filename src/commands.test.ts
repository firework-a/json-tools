import { describe, it, expect } from 'vitest'
import { searchCommands, COMMANDS } from './commands'

describe('searchCommands', () => {
  it('空查询返回全部命令', () => {
    expect(searchCommands('').length).toBe(COMMANDS.length)
  })

  it('label 前缀命中得分最高', () => {
    const results = searchCommands('美化')
    expect(results[0].label.toLowerCase().startsWith('美化')).toBe(true)
  })

  it('keywords 命中', () => {
    const results = searchCommands('beautify')
    expect(results.some(c => c.id === 'json.beautify')).toBe(true)
  })

  it('子序列匹配（宽松）', () => {
    const results = searchCommands('tls')
    expect(results.some(c => c.id === 'mode.tools')).toBe(true)
  })

  it('未命中返回空', () => {
    expect(searchCommands('zzzz不存在')).toHaveLength(0)
  })

  it('命令 id 唯一', () => {
    const ids = COMMANDS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
