import { describe, expect, it } from 'vitest'
import { exportTable, tableToHtml, tableToMarkdown } from './tableExport'

describe('tableToMarkdown', () => {
  it('列并集、缺失值留空、嵌套值序列化、竖线转义', () => {
    const md = tableToMarkdown(['a', 'b'], [{ a: 1, b: null }, { a: 'x|y' }, { a: { c: 2 } }])
    const lines = md.split('\n')
    expect(lines[0]).toBe('| a | b |')
    expect(lines[1]).toBe('| --- | --- |')
    expect(lines[2]).toBe('| 1 |  |')
    expect(lines[3]).toBe('| x\\|y |  |')
    expect(lines[4]).toBe('| {"c":2} |  |')
  })
})

describe('tableToHtml', () => {
  it('转义尖括号与引号，带 caption', () => {
    const html = tableToHtml(['a'], [{ a: '<b>&"' }], 'root.items')
    expect(html).toContain('<caption>root.items</caption>')
    expect(html).toContain('&lt;b&gt;&amp;&quot;')
  })
})

describe('exportTable', () => {
  it('根数组直接导出', () => {
    const r = exportTable('[{"id":1,"name":"a"},{"id":2,"name":"b"}]', 'markdown')
    expect(r.error).toBeNull()
    expect(r.result.split('\n')).toHaveLength(4)
  })

  it('下钻 root.items 并导出 HTML', () => {
    const r = exportTable('{"total":2,"items":[{"id":1}]}', 'html')
    expect(r.result).toContain('<caption>root.items</caption>')
    expect(r.result).toContain('<th>id</th>')
  })

  it('无对象数组与非法输入报错', () => {
    expect(exportTable('{"a":1}', 'markdown').error).toContain('对象数组')
    expect(exportTable('{a', 'markdown').error).toBeTruthy()
  })
})
