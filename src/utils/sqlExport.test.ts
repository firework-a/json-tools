import { describe, expect, it } from 'vitest'
import { exportSql } from './sqlExport'

const rows = JSON.stringify([
  { id: 1, name: "O'Brien", active: true, score: 1.5, at: '2026-01-02T03:04:05Z', tags: ['a', 'b'], meta: { k: 1 } },
  { id: 2, name: 'ann', active: false, score: 2, at: '2026-01-03T00:00:00Z', tags: [], meta: { k: 2 } },
])

describe('exportSql', () => {
  it('根数组用默认表名并按值推断列类型', () => {
    const { result, error } = exportSql(rows, { dialect: 'postgres' })
    expect(error).toBeNull()
    expect(result).toContain('CREATE TABLE "data_rows" (')
    expect(result).toContain('"id" BIGINT NOT NULL')
    expect(result).toContain('"score" DOUBLE PRECISION NOT NULL')
    expect(result).toContain('"active" BOOLEAN NOT NULL')
    expect(result).toContain('"at" TIMESTAMPTZ NOT NULL')
    expect(result).toContain('"tags" JSONB NOT NULL')
    expect(result).toContain('"name" VARCHAR(7) NOT NULL')
    expect(result).toContain('INSERT INTO "data_rows"')
    expect(result).toContain("'O''Brien'")
  })

  it('根下的对象数组用字段名作表名', () => {
    const { result } = exportSql(JSON.stringify({ total: 1, items: [{ a: 1 }] }), { dialect: 'mysql' })
    expect(result).toContain('CREATE TABLE `items` (')
    expect(result).toContain('INSERT INTO `items` (`a`) VALUES')
    expect(result).toContain('  (1);')
  })

  it('缺失字段与 null 让列可空并写入 NULL', () => {
    const { result } = exportSql(JSON.stringify([{ a: 1, b: 'x' }, { a: 2, b: null }]), { dialect: 'sqlite' })
    expect(result).toContain('"b" TEXT')          // 无 NOT NULL
    expect(result).toContain('"a" INTEGER NOT NULL')
    expect(result).toContain('(2, NULL)')
  })

  it('全为 null 的列不写进 DDL', () => {
    const { result } = exportSql(JSON.stringify([{ a: 1, b: null }]), { dialect: 'sqlite' })
    expect(result).not.toContain('"b"')
    expect(result).toContain('(1);')
  })

  it('类型混杂退化为文本，布尔按方言编码', () => {
    const { result } = exportSql(JSON.stringify([{ v: true }, { v: 3 }]), { dialect: 'mysql' })
    expect(result).toContain('`v` TEXT NOT NULL')
    expect(result).toContain('(1)')
  })

  it('batchSize 分批插入', () => {
    const input = JSON.stringify(Array.from({ length: 5 }, (_, i) => ({ i })))
    const { result } = exportSql(input, { batchSize: 2 })
    expect(result.match(/INSERT INTO/g)).toHaveLength(3)
  })

  it('includeCreate=false 只输出 INSERT', () => {
    const { result } = exportSql(rows, { includeCreate: false })
    expect(result).not.toContain('CREATE TABLE')
    expect(result).toContain('INSERT INTO')
  })

  it('非法 JSON 与找不到对象数组时给出错误', () => {
    expect(exportSql('{', {}).error).toBeTruthy()
    expect(exportSql('{"a":1}', {}).error).toContain('未找到对象数组')
    expect(exportSql('[]', {}).error).toContain('未找到对象数组')
  })

  it('表名做安全字符过滤', () => {
    const { result } = exportSql(JSON.stringify({ 'user order': [{ a: 1 }] }), { table: 'public.users-2' })
    expect(result).toContain('CREATE TABLE "public_users_2"')
  })
})
