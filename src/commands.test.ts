import { describe, it, expect } from 'vitest'
import { searchCommands, COMMANDS } from './commands'
import { TOOLS } from './tools'

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

  it('中文关键词能同时命中同类工具', () => {
    const ids = searchCommands('排序').map(c => c.id)
    expect(ids).toContain('tool.sort')
    expect(ids).toContain('tool.sortByField')
    expect(searchCommands('sql').map(c => c.id)).toContain('tool.sql')
  })

  it('命令 id 唯一', () => {
    const ids = COMMANDS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每个工具箱工具都能从命令面板直达', () => {
    const reachable = new Set(COMMANDS.filter(c => c.id.startsWith('tool.')).map(c => c.id.slice('tool.'.length)))
    const missing = TOOLS.map(t => t.id).filter(id => !reachable.has(id))
    expect(missing, `命令面板缺少工具：${missing.join(', ')}`).toEqual([])
  })
})
