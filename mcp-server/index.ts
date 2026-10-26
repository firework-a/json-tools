#!/usr/bin/env node
// JSON Tools MCP Server + CLI 单入口。
//
//   无参数            → 以 stdio transport 启动 MCP Server（AI 客户端自动拉起）
//   list / run <tool> → 一次性 CLI 调用，结果写 stdout
//
// 工具实现与参数 schema 全部来自 tools.ts，与桌面端共用 src/utils 纯函数。
import { existsSync, readFileSync, statSync } from 'node:fs'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { SERVER_NAME, SERVER_VERSION, TOOLS, type ToolDef } from './tools'

const CLI = 'json-tools-mcp'

const fieldNames = (t: ToolDef) => Object.keys(t.schema)

/** 取工具的主输入字段（长文本 JSON 从 stdin 或文件灌入的那一个）。 */
const primaryField = (t: ToolDef) => fieldNames(t).find(k => ['text', 'sample', 'left'].includes(k))

const fieldHint = (field: unknown): string => {
  const f = field as { description?: string; _zod?: { def?: { description?: string } } }
  return f?.description ?? f?._zod?.def?.description ?? ''
}

type ZodField = { safeParse: (data: unknown) => { success: boolean } } | undefined

const isOptionalField = (field: ZodField) => !!field && field.safeParse(undefined).success

const usage = (t: ToolDef) => {
  const lines = fieldNames(t).map(k => {
    const field = t.schema[k] as unknown as ZodField
    return `  --${k} <值>  ${isOptionalField(field) ? '可选' : '必填'}  ${fieldHint(field)}`
  })
  return [`用法：${CLI} run ${t.name} [参数]`, ...lines].join('\n')
}

const help = () => [
  `${CLI} ${SERVER_VERSION} — JSON Tools 的 13 个 JSON 工具`,
  '',
  '用法：',
  `  ${CLI}                        以 stdio 启动 MCP Server（AI 客户端用这个，不要手动运行）`,
  `  ${CLI} list                   列出全部工具`,
  `  ${CLI} run <tool> [参数]       一次性调用，结果打印到 stdout`,
  `  ${CLI} help / --help / -v     版本与帮助`,
  '',
  'run 参数：',
  '  --<字段> <值>          值为已存在的文件路径时自动读取文件内容',
  '  --<字段> -             该字段从 stdin 读取',
  '  管道输入且未指定主字段时，自动灌入 text / sample / left',
  '',
  '示例：',
  `  echo '{a:1,}' | ${CLI} run json_repair`,
  `  ${CLI} run json_format --text broken.json --indent 4`,
  `  ${CLI} run json_diff --left a.json --right b.json`,
].join('\n')

const readStdin = () => {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

const parseFlags = (tokens: string[]) => {
  const out: Record<string, string> = {}
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token === '-h' || token === '--help') {
      out.help = 'true'
      continue
    }
    if (!token.startsWith('--')) throw new Error(`未识别的参数：${token}`)
    const eq = token.indexOf('=')
    if (eq > 0) {
      out[token.slice(2, eq)] = token.slice(eq + 1)
      continue
    }
    const key = token.slice(2)
    if (key === 'help') {
      out.help = 'true'
      continue
    }
    const next = tokens[i + 1]
    if (next === undefined || next.startsWith('--')) throw new Error(`参数 --${key} 缺少值`)
    out[key] = next
    i++
  }
  return out
}

const fileContent = (value: string) => {
  try {
    return existsSync(value) && statSync(value).isFile() ? readFileSync(value, 'utf8') : null
  } catch {
    return null
  }
}

/** 依次尝试：文件内容 → 字面值 → JSON 解析值，取第一个通过该字段校验的。 */
const resolveValue = (field: ZodField, raw: string): unknown => {
  if (raw === '-') return readStdin()
  const candidates: unknown[] = [raw]
  const fromFile = fileContent(raw)
  if (fromFile !== null) candidates.unshift(fromFile)
  try {
    candidates.push(JSON.parse(raw))
  } catch {
    // 非 JSON 字面量，按字符串处理
  }
  for (const c of candidates) if (!field || field.safeParse(c).success) return c
  return raw
}

async function cli(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv
  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(help())
    return 0
  }
  if (cmd === 'version' || cmd === '--version' || cmd === '-v') {
    console.log(`${CLI} ${SERVER_VERSION}`)
    return 0
  }
  if (cmd === 'list') {
    for (const t of TOOLS) console.log(`${t.name}  ${t.description}`)
    console.log(`\n共 ${TOOLS.length} 个工具，参数详情：${CLI} run <tool>`)
    return 0
  }
  if (cmd !== 'run' && !TOOLS.some(t => t.name === cmd)) {
    console.error(`未知命令：${cmd}\n\n${help()}`)
    return 2
  }

  const name = cmd === 'run' ? rest[0] : cmd
  const def = TOOLS.find(t => t.name === name)
  if (!def) {
    console.error(`缺少工具名。可用工具：\n${TOOLS.map(t => `  ${t.name}`).join('\n')}`)
    return 2
  }

  let provided: Record<string, string>
  try {
    provided = parseFlags(cmd === 'run' ? rest.slice(1) : rest)
  } catch (e) {
    console.error(`${e instanceof Error ? e.message : String(e)}\n\n${usage(def)}`)
    return 2
  }
  if ('help' in provided) {
    console.log(usage(def))
    return 0
  }

  const unknown = Object.keys(provided).filter(k => !fieldNames(def).includes(k))
  if (unknown.length) {
    console.error(`参数 ${unknown.map(k => `--${k}`).join(', ')} 不属于 ${def.name}\n\n${usage(def)}`)
    return 2
  }

  const primary = primaryField(def)
  if (primary && !(primary in provided) && !process.stdin.isTTY) {
    const piped = readStdin()
    if (piped.trim()) provided[primary] = piped
  }
  if (!Object.keys(provided).length) {
    console.log(usage(def))
    return 2
  }

  const raw: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(provided)) raw[k] = resolveValue(def.schema[k] as unknown as ZodField, v)

  let input: unknown
  try {
    input = z.object(def.schema).parse(raw)
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.error(`${def.name} 参数校验失败：\n${e.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`)
      return 2
    }
    throw e
  }

  const out = await def.run(input as Parameters<typeof def.run>[0])
  const body = out.content.map(c => c.text).join('\n')
  if (out.isError) {
    console.error(body)
    return 1
  }
  process.stdout.write(`${body}\n`)
  return 0
}

function startMcpServer() {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION })
  for (const t of TOOLS) {
    server.registerTool(t.name, { description: t.description, inputSchema: t.schema }, args =>
      t.run(args as Parameters<typeof t.run>[0]),
    )
  }
  return server.connect(new StdioServerTransport())
}

async function main(): Promise<number> {
  if (process.argv[2]) return cli(process.argv.slice(2))
  await startMcpServer()
  return 0
}

main()
  .then(code => {
    if (code) process.exit(code)
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
