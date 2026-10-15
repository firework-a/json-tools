// JSON Tools MCP Server
// 把 JSON Tools 的核心 JSON 能力暴露为 MCP (Model Context Protocol) 工具，
// 供 AI 助手（Claude Desktop / Codex / Cursor 等）通过 stdio 调用。
//
// 运行：pnpm mcp  （等价于 tsx mcp-server/index.ts）
// 复用 src/utils 下的纯函数模块（无 DOM / Tauri 依赖），与桌面端逻辑一致。
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { repairJsonDeep, formatJson, compressJson, tryParseJson, getJsonStats, detectFormat } from '../src/utils/json'
import { sortJsonKeys, flattenJson, unflattenJson, removeEmptyValues } from '../src/utils/jsonTransform'
import { jsonToYaml, yamlToJson } from '../src/utils/jsonYaml'
import { jsonToXml, xmlToJson, jsonToToml, tomlToJson, jsonToCsv, csvToJson } from '../src/utils/jsonFormats'
import { convertNdjson } from '../src/utils/ndjson'
import { generateMock } from '../src/utils/mockData'
import { analyzeJson } from '../src/utils/insights'
import { jsonToSchema } from '../src/utils/jsonSchema'
import { validateJsonSchema } from '../src/utils/schemaValidator'
import { computeDiff } from '../src/utils/jsonDiffer'
import { buildTable } from '../src/utils/table'
import { JSONPath } from 'jsonpath-plus'
import { search as jmesSearch } from 'jmespath'

const text = (body: unknown) => ({ content: [{ type: 'text' as const, text: typeof body === 'string' ? body : JSON.stringify(body, null, 2) }] })
const fail = (msg: string) => ({ content: [{ type: 'text' as const, text: `错误：${msg}` }], isError: true as const })

const server = new McpServer({ name: 'json-tools', version: '0.2.0' })

// 1. 修复非标准 JSON
server.tool(
  'json_repair',
  '修复非标准 JSON（注释/单引号/尾逗号/无引号键/截断 payload），返回合法 JSON',
  { text: z.string().describe('待修复的 JSON 文本') },
  async ({ text: input }) => {
    const r = repairJsonDeep(input)
    if (r.error) return fail(r.error)
    return text(r.result)
  },
)

// 2. 格式化 / 压缩
server.tool(
  'json_format',
  '格式化（beautify）或压缩（minify）JSON',
  {
    text: z.string().describe('JSON 文本'),
    mode: z.enum(['beautify', 'minify']).default('beautify').describe('beautify=格式化, minify=压缩'),
    indent: z.number().int().min(2).max(8).default(2).describe('格式化缩进空格数'),
  },
  async ({ text: input, mode, indent }) => {
    const r = mode === 'minify' ? compressJson(input) : formatJson(input, indent)
    if (r.error) return fail(r.error)
    return text(r.result)
  },
)

// 3. 校验（语法 + 可选 Schema）
server.tool(
  'json_validate',
  '校验 JSON 语法，可选按 JSON Schema 校验；返回 ok/errors 与基础统计',
  {
    text: z.string().describe('JSON 文本'),
    schema: z.string().optional().describe('JSON Schema（字符串形式，可选）'),
  },
  async ({ text: input, schema }) => {
    if (schema) {
      const v = validateJsonSchema(input, schema)
      return text({ valid: v.valid, errors: v.errors })
    }
    const { parsed, error } = tryParseJson(input)
    if (error) return text({ valid: false, errors: [error] })
    const stats = getJsonStats(input)
    return text({ valid: true, keys: stats.keyCount, depth: stats.depth, size: stats.size, lines: stats.lineCount })
  },
)

// 4. 格式互转
server.tool(
  'json_convert',
  'JSON 与 YAML / XML / TOML / CSV / NDJSON 互转（自动识别方向）',
  {
    text: z.string().describe('输入文本'),
    to: z.enum(['yaml', 'xml', 'toml', 'csv', 'ndjson', 'json']).describe('目标格式'),
  },
  async ({ text: input, to }) => {
    if (to === 'json') {
      // 反向：YAML/XML/TOML/CSV → JSON（按内容自动识别）
      const fmt = detectFormat(input)
      const r = fmt === 'xml' ? xmlToJson(input)
        : fmt === 'toml' ? tomlToJson(input)
        : fmt === 'csv' ? csvToJson(input)
        : yamlToJson(input)
      if (r.error) return fail(r.error)
      return text(r.result)
    }
    if (to === 'ndjson') {
      const parsed = JSON.parse(input)
      const items = Array.isArray(parsed) ? parsed : [parsed]
      return text(items.map(i => JSON.stringify(i)).join('\n'))
    }
    const parsed = JSON.parse(input)
    const r = to === 'yaml' ? jsonToYaml(JSON.stringify(parsed))
      : to === 'xml' ? jsonToXml(JSON.stringify(parsed))
      : to === 'toml' ? jsonToToml(JSON.stringify(parsed))
      : jsonToCsv(JSON.stringify(parsed))
    if (r.error) return fail(r.error)
    return text(r.result)
  },
)

// 5. 结构变换
server.tool(
  'json_transform',
  'JSON 结构变换：按键排序 / 扁平化 / 扁平还原 / 去 null / 去空值 / 数组去重',
  {
    text: z.string().describe('JSON 文本'),
    op: z.enum(['sortAsc', 'sortDesc', 'flatten', 'unflatten', 'removeNull', 'removeEmpty', 'dedup']).describe('变换操作'),
  },
  async ({ text: input, op }) => {
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
    if (r.error) return fail(r.error)
    return text(r.result)
  },
)

// 6. Diff
server.tool(
  'json_diff',
  '对比两个 JSON，返回行级差异摘要（增/删行数与差异行）',
  {
    left: z.string().describe('左侧 JSON'),
    right: z.string().describe('右侧 JSON'),
  },
  async ({ left, right }) => {
    const d = computeDiff(left, right)
    return text({
      changedLines: d.left.size + d.right.size,
      removedOnLeft: [...d.leftRemoved].sort((a, b) => a - b),
      addedOnRight: [...d.rightAdded].sort((a, b) => a - b),
    })
  },
)

// 7. Mock 数据生成
server.tool(
  'json_mock',
  '从样例 JSON 结构或 JSON Schema 生成仿真 Mock 数据',
  {
    sample: z.string().describe('样例 JSON 或 JSON Schema'),
    count: z.number().int().min(1).max(100).default(5).describe('生成条数'),
  },
  async ({ sample, count }) => {
    const r = generateMock(sample, count)
    if (r.error) return fail(r.error)
    return text(r.result)
  },
)

// 8. 统计
server.tool(
  'json_stats',
  'JSON 统计：键数 / 嵌套深度 / 大小 / 行数 / 格式识别',
  { text: z.string().describe('JSON 文本') },
  async ({ text: input }) => {
    const s = getJsonStats(input)
    return text({ keys: s.keyCount, depth: s.depth, sizeBytes: s.size, lines: s.lineCount, detectedFormat: detectFormat(input) })
  },
)

// 9. 查询
server.tool(
  'json_query',
  '用 JSONPath 或 JMESPath 查询 JSON',
  {
    text: z.string().describe('JSON 文本'),
    path: z.string().describe('查询表达式（JSONPath 如 $.a[*].b，或 JMESPath）'),
    lang: z.enum(['jsonpath', 'jmespath']).default('jsonpath').describe('查询语言'),
  },
  async ({ text: input, path, lang }) => {
    const { parsed, error } = tryParseJson(input)
    if (error) return fail(error)
    try {
      if (lang === 'jmespath') return text(JSON.stringify(jmesSearch(parsed, path), null, 2))
      const r = JSONPath({ json: parsed as object, path, wrap: false })
      return text(JSON.stringify(r, null, 2))
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e))
    }
  },
)

// 10. 表格提取
server.tool(
  'json_table_extract',
  '把 JSON 中的对象数组提取为表格行/列（自动下钻根下数组字段）',
  {
    text: z.string().describe('JSON 文本，需包含对象数组'),
  },
  async ({ text: input }) => {
    const t = buildTable(JSON.parse(input))
    if (!t) return fail('未找到对象数组（需要根数组或根下的对象数组字段）')
    return text({
      title: t.title,
      rows: t.rows.length,
      columns: t.columns,
      data: t.rows.slice(0, 50),
    })
  },
)

// 11. Schema 生成
server.tool(
  'json_to_schema',
  '从 JSON 样本推断 JSON Schema (draft-07)',
  { text: z.string().describe('JSON 样本') },
  async ({ text: input }) => {
    const r = jsonToSchema(input)
    if (r.error) return fail(r.error)
    return text(r.result)
  },
)

// 12. 智能分析
server.tool(
  'json_insights',
  '智能分析 JSON：结构摘要、字段类型统计、数据质量问题与优化建议（本地规则引擎）',
  { text: z.string().describe('JSON 文本') },
  async ({ text: input }) => {
    const r = analyzeJson(input)
    if (r.error) return fail(r.error)
    return text(r.result)
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
