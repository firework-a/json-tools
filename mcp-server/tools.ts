// 13 个 JSON 工具的单一定义源：MCP 工具注册与 CLI 子命令共用同一份 schema 与实现。
import { z } from 'zod'

import { repairJsonDeep, formatJson, compressJson, tryParseJson, getJsonStats, detectFormat } from '../src/utils/json'
import { sortJsonKeys, flattenJson, unflattenJson, removeEmptyValues, dedupJson } from '../src/utils/jsonTransform'
import { jsonToYaml, yamlToJson } from '../src/utils/jsonYaml'
import { jsonToXml, xmlToJson, jsonToToml, tomlToJson, jsonToCsv, csvToJson } from '../src/utils/jsonFormats'
import { convertNdjson } from '../src/utils/ndjson'
import { generateMock } from '../src/utils/mockData'
import { analyzeJson } from '../src/utils/insights'
import { jsonToSchema } from '../src/utils/jsonSchema'
import { validateJsonSchema } from '../src/utils/schemaValidator'
import { computeDiff } from '../src/utils/jsonDiffer'
import { buildTable } from '../src/utils/table'
import { convertKeys, type KeyCase } from '../src/utils/keyCase'
import { mergeJson, type MergeArrayStrategy, type MergePrefer } from '../src/utils/merge'
import { redactJson } from '../src/utils/redact'
import { humanizeTimestamps, toEpochTimestamps, type TimestampFormat } from '../src/utils/timestamps'
import { exportTable } from '../src/utils/tableExport'
import { collectPaths } from '../src/utils/paths'
import { filterPaths, type PickMode } from '../src/utils/pickPaths'
import { JSONPath } from 'jsonpath-plus'
import { search as jmesSearch } from 'jmespath'

export const SERVER_NAME = 'json-tools'
export const SERVER_VERSION = '0.1.7'

export type ToolOutput = { content: { type: 'text'; text: string }[]; isError?: boolean }

const ok = (body: unknown): ToolOutput => ({
  content: [{ type: 'text', text: typeof body === 'string' ? body : JSON.stringify(body, null, 2) }],
})
const fail = (msg: string): ToolOutput => ({ content: [{ type: 'text', text: `错误：${msg}` }], isError: true })

type AnyShape = z.ZodRawShape

/** zod v4 下从 raw shape 推入参类型（与 SDK 解析 tools/call 参数等价）。 */
type Args<S extends AnyShape> = z.output<z.ZodObject<S>>

export interface ToolDef<S extends AnyShape = AnyShape> {
  name: string
  description: string
  schema: S
  run: (input: Args<S>) => ToolOutput
}

/** 声明单个工具：保留入参推断，同时抹平到 ToolDef 便于遍历注册。 */
const tool = <S extends AnyShape>(def: ToolDef<S>): ToolDef => def as unknown as ToolDef

export const TOOLS: ToolDef[] = [
  tool({
    name: 'json_repair',
    description: '修复非标准 JSON（注释/单引号/尾逗号/无引号键/截断 payload），返回合法 JSON',
    schema: { text: z.string().describe('待修复的 JSON 文本') },
    run: ({ text: input }) => {
      const r = repairJsonDeep(input)
      return r.error ? fail(r.error) : ok(r.result)
    },
  }),
  tool({
    name: 'json_format',
    description: '格式化（beautify）或压缩（minify）JSON',
    schema: {
      text: z.string().describe('JSON 文本'),
      mode: z.enum(['beautify', 'minify']).default('beautify').describe('beautify=格式化, minify=压缩'),
      indent: z.number().int().min(2).max(8).default(2).describe('格式化缩进空格数'),
    },
    run: ({ text: input, mode, indent }) => {
      const r = mode === 'minify' ? compressJson(input) : formatJson(input, indent)
      return r.error ? fail(r.error) : ok(r.result)
    },
  }),
  tool({
    name: 'json_validate',
    description: '校验 JSON 语法，可选按 JSON Schema 校验；返回 ok/errors 与基础统计',
    schema: {
      text: z.string().describe('JSON 文本'),
      schema: z.string().optional().describe('JSON Schema（字符串形式，可选）'),
    },
    run: ({ text: input, schema }) => {
      if (schema) {
        const v = validateJsonSchema(input, schema)
        return ok({ valid: v.valid, errors: v.errors })
      }
      const { error } = tryParseJson(input)
      if (error) return ok({ valid: false, errors: [error] })
      const stats = getJsonStats(input)
      return ok({ valid: true, keys: stats.keyCount, depth: stats.depth, size: stats.size, lines: stats.lineCount })
    },
  }),
  tool({
    name: 'json_convert',
    description: 'JSON 与 YAML / XML / TOML / CSV / NDJSON 互转（json 目标时按内容自动识别源格式）',
    schema: {
      text: z.string().describe('输入文本'),
      to: z.enum(['yaml', 'xml', 'toml', 'csv', 'ndjson', 'json']).describe('目标格式'),
    },
    run: ({ text: input, to }) => {
      if (to === 'json') {
        const attempts = [yamlToJson(input), xmlToJson(input), tomlToJson(input), csvToJson(input)]
        const found = attempts.find(r => !r.error && r.result.trim())
        return found ? ok(found.result) : fail('无法识别输入格式（支持 YAML / XML / TOML / CSV / NDJSON）')
      }
      if (to === 'ndjson') {
        const r = convertNdjson(input, false)
        return r.error ? fail(r.error) : ok(r.result)
      }
      const parsed = JSON.parse(input)
      const payload = JSON.stringify(parsed)
      const r = to === 'yaml' ? jsonToYaml(payload)
        : to === 'xml' ? jsonToXml(payload)
          : to === 'toml' ? jsonToToml(payload)
            : jsonToCsv(payload)
      return r.error ? fail(r.error) : ok(r.result)
    },
  }),
  tool({
    name: 'json_ndjson',
    description: 'NDJSON 与 JSON 数组互转（to=json 解析 NDJSON；to=ndjson 把 JSON 数组转为 NDJSON）',
    schema: {
      text: z.string().describe('输入文本'),
      to: z.enum(['json', 'ndjson']).describe('目标格式'),
    },
    run: ({ text: input, to }) => {
      const r = convertNdjson(input, to === 'json')
      return r.error ? fail(r.error) : ok(r.result)
    },
  }),
  tool({
    name: 'json_transform',
    description: 'JSON 结构变换：按键排序 / 扁平化 / 扁平还原 / 去 null / 去空值 / 数组去重',
    schema: {
      text: z.string().describe('JSON 文本'),
      op: z.enum(['sortAsc', 'sortDesc', 'flatten', 'unflatten', 'removeNull', 'removeEmpty', 'dedup']).describe('变换操作'),
    },
    run: ({ text: input, op }) => {
      const map: Record<string, (c: string) => { result: string; error: string | null }> = {
        sortAsc: c => sortJsonKeys(c, 'asc'),
        sortDesc: c => sortJsonKeys(c, 'desc'),
        flatten: c => flattenJson(c),
        unflatten: c => unflattenJson(c),
        removeNull: c => removeEmptyValues(c, true),
        removeEmpty: c => removeEmptyValues(c, false),
        dedup: c => dedupJson(c),
      }
      const r = map[op](input)
      return r.error ? fail(r.error) : ok(r.result)
    },
  }),
  tool({
    name: 'json_diff',
    description: '对比两个 JSON，返回行级差异摘要（变更行数与差异行号）',
    schema: {
      left: z.string().describe('左侧 JSON'),
      right: z.string().describe('右侧 JSON'),
    },
    run: ({ left, right }) => {
      const d = computeDiff(left, right)
      return ok({
        changedLines: d.leftRemoved.size + d.rightAdded.size,
        removedOnLeft: [...d.leftRemoved].sort((a, b) => a - b),
        addedOnRight: [...d.rightAdded].sort((a, b) => a - b),
      })
    },
  }),
  tool({
    name: 'json_mock',
    description: '从样例 JSON 结构或 JSON Schema 生成仿真 Mock 数据',
    schema: {
      sample: z.string().describe('样例 JSON 或 JSON Schema'),
      count: z.number().int().min(1).max(100).default(5).describe('生成条数'),
    },
    run: ({ sample, count }) => {
      const r = generateMock(sample, count)
      return r.error ? fail(r.error) : ok(r.result)
    },
  }),
  tool({
    name: 'json_stats',
    description: 'JSON 统计：键数 / 嵌套深度 / 大小 / 行数 / 格式识别',
    schema: { text: z.string().describe('JSON 文本') },
    run: ({ text: input }) => {
      const s = getJsonStats(input)
      return ok({ keys: s.keyCount, depth: s.depth, sizeBytes: s.size, lines: s.lineCount, detectedFormat: detectFormat(input) })
    },
  }),
  tool({
    name: 'json_query',
    description: '用 JSONPath 或 JMESPath 查询 JSON',
    schema: {
      text: z.string().describe('JSON 文本'),
      path: z.string().describe('查询表达式（JSONPath 如 $.a[*].b，或 JMESPath）'),
      lang: z.enum(['jsonpath', 'jmespath']).default('jsonpath').describe('查询语言'),
    },
    run: ({ text: input, path, lang }) => {
      const { parsed, error } = tryParseJson(input)
      if (error) return fail(error)
      try {
        if (lang === 'jmespath') return ok(JSON.stringify(jmesSearch(parsed, path), null, 2))
        return ok(JSON.stringify(JSONPath({ json: parsed as object, path, wrap: false }), null, 2))
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e))
      }
    },
  }),
  tool({
    name: 'json_table_extract',
    description: '把 JSON 中的对象数组提取为表格行/列（自动下钻根下数组字段）',
    schema: { text: z.string().describe('JSON 文本，需包含对象数组') },
    run: ({ text: input }) => {
      let t
      try {
        t = buildTable(JSON.parse(input))
      } catch {
        return fail('输入不是合法 JSON')
      }
      if (!t) return fail('未找到对象数组（需要根数组或根下的对象数组字段）')
      return ok({ title: t.title, rows: t.rows.length, columns: t.columns, data: t.rows.slice(0, 50) })
    },
  }),
  tool({
    name: 'json_to_schema',
    description: '从 JSON 样本推断 JSON Schema (draft-07)',
    schema: { text: z.string().describe('JSON 样本') },
    run: ({ text: input }) => {
      const r = jsonToSchema(input)
      return r.error ? fail(r.error) : ok(r.result)
    },
  }),
  tool({
    name: 'json_insights',
    description: '智能分析 JSON：结构摘要、字段类型统计、数据质量问题与优化建议（本地规则引擎）',
    schema: { text: z.string().describe('JSON 文本') },
    run: ({ text: input }) => {
      const r = analyzeJson(input)
      return r.error ? fail(r.error) : ok(r.result)
    },
  }),
  tool({
    name: 'json_keys_case',
    description: '递归批量转换键名风格（camelCase / snake_case / kebab-case / PascalCase）；撞名时报错避免丢数据',
    schema: {
      text: z.string().describe('JSON 文本'),
      style: z.enum(['camel', 'snake', 'kebab', 'pascal']).default('camel').describe('目标键名风格'),
    },
    run: ({ text: input, style }) => {
      const r = convertKeys(input, style as KeyCase)
      return r.error ? fail(r.error) : ok(r.result)
    },
  }),
  tool({
    name: 'json_merge',
    description: '两份 JSON 深度合并（对象递归；数组支持整体替换/拼接/并集去重；标量冲突可指定取哪一侧）',
    schema: {
      left: z.string().describe('基准 JSON'),
      right: z.string().describe('增量 JSON'),
      arrayStrategy: z.enum(['replace', 'concat', 'union']).default('replace').describe('数组处理方式'),
      prefer: z.enum(['left', 'right']).default('right').describe('标量冲突时取哪一侧'),
    },
    run: ({ left, right, arrayStrategy, prefer }) => {
      const r = mergeJson(left, right, { arrayStrategy: arrayStrategy as MergeArrayStrategy, prefer: prefer as MergePrefer })
      return r.error ? fail(r.error) : ok(r.result)
    },
  }),
  tool({
    name: 'json_redact',
    description: '敏感字段脱敏：按键名（password/token/secret…）与值格式（手机号/身份证/邮箱/JWT/IP/卡号）递归打码，返回脱敏结果与命中清单',
    schema: {
      text: z.string().describe('JSON 文本'),
      keepEdges: z.boolean().default(true).describe('是否保留首尾 2 个字符便于核对'),
      extraKeyPattern: z.string().optional().describe('追加的键名正则（可选）'),
    },
    run: ({ text: input, keepEdges, extraKeyPattern }) => {
      const r = redactJson(input, { keepEdges, extraKeyPattern })
      if (r.error) return fail(r.error)
      return ok({ result: JSON.parse(r.result), hits: r.hits })
    },
  }),
  tool({
    name: 'json_timestamps',
    description: '递归时间戳互转：toHuman 把秒/毫秒 epoch 转成日期，toEpoch 把日期字符串转回毫秒；返回结果与命中路径',
    schema: {
      text: z.string().describe('JSON 文本'),
      mode: z.enum(['toHuman', 'toEpoch']).default('toHuman').describe('转换方向'),
      format: z.enum(['iso', 'local']).default('iso').describe('toHuman 的日期格式'),
    },
    run: ({ text: input, mode, format }) => {
      const r = mode === 'toEpoch' ? toEpochTimestamps(input) : humanizeTimestamps(input, { format: format as TimestampFormat })
      if (r.error) return fail(r.error)
      return ok({ result: JSON.parse(r.result), hits: r.hits })
    },
  }),
  tool({
    name: 'json_table_export',
    description: '把 JSON 里的对象数组导出为 Markdown 或 HTML 表格文本（自动下钻根下数组字段）',
    schema: {
      text: z.string().describe('JSON 文本，需包含对象数组'),
      format: z.enum(['markdown', 'html']).default('markdown').describe('输出格式'),
    },
    run: ({ text: input, format }) => {
      const r = exportTable(input, format as 'markdown' | 'html')
      return r.error ? fail(r.error) : ok(r.result)
    },
  }),
  tool({
    name: 'json_paths',
    description: '统计 JSON 字段结构：每个路径的出现次数、父级覆盖率、类型分布、null 数与示例值（数组折叠为 [*]），用于分析接口字段是否可选/类型混杂',
    schema: { text: z.string().describe('JSON 文本') },
    run: ({ text: input }) => {
      const r = collectPaths(input)
      return r.error ? fail(r.error) : ok({ total: r.stats.length, paths: r.stats })
    },
  }),
  tool({
    name: 'json_pick_paths',
    description: '按路径剔除或只保留字段（与 json_paths 同一套路径记法，数组写 [*]）；简写如 __typename 匹配任意层级同名键',
    schema: {
      text: z.string().describe('JSON 文本'),
      patterns: z.string().describe('路径列表，逗号或换行分隔，如 "__typename, items[*].secret"'),
      mode: z.enum(['omit', 'keep']).default('omit').describe('omit=剔除，keep=只保留'),
    },
    run: ({ text: input, patterns, mode }) => {
      const r = filterPaths(input, patterns, mode as PickMode)
      if (r.error) return fail(r.error)
      return ok({ result: JSON.parse(r.result), hits: r.hits })
    },
  }),
]
