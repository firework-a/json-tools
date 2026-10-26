// MCP/CLI 新增工具的 stdio 冒烟测试：initialize → tools/list → 逐个调用 7 个数据处理工具
import { spawn } from 'node:child_process'

const child = spawn('node', ['mcp-server/dist/index.js'], { stdio: ['pipe', 'pipe', 'pipe'] })
let buf = ''
const responses = []
child.stdout.on('data', d => {
  buf += d.toString()
  let idx
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim()
    buf = buf.slice(idx + 1)
    if (line) responses.push(JSON.parse(line))
  }
})
child.stderr.on('data', d => process.stderr.write(`[server] ${d}`))

const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`)
const waitFor = count => new Promise(resolve => {
  const tick = () => (responses.length >= count ? resolve() : setTimeout(tick, 40))
  tick()
})

send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke3', version: '1' } } })
await waitFor(1)
send({ jsonrpc: '2.0', method: 'notifications/initialized' })
send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
await waitFor(2)

const tools = responses[1].result.tools.map(t => t.name)
console.log(`tools: ${tools.length}`)
const expected = ['json_keys_case', 'json_merge', 'json_redact', 'json_timestamps', 'json_table_export', 'json_to_sql', 'json_sort_by', 'json_paths', 'json_pick_paths']
const missing = expected.filter(t => !tools.includes(t))
console.log(missing.length ? `MISSING: ${missing.join(', ')}` : 'new tools present: ok')

const DOC = JSON.stringify({ items: [{ id: 1, secret: 's', __typename: 'T' }, { id: 2, secret: 't' }], userPassword: 'hunter2!!' })
const calls = [
  ['json_keys_case', { text: '{"user_info":{"first_name":"a"}}', style: 'camel' }],
  ['json_merge', { left: '{"a":1,"n":{"x":1}}', right: '{"b":2,"n":{"x":9}}', arrayStrategy: 'replace', prefer: 'right' }],
  ['json_redact', { text: DOC, keepEdges: true }],
  ['json_timestamps', { text: '{"t":1700000000}', mode: 'toHuman', format: 'iso' }],
  ['json_table_export', { text: '[{"id":1,"name":"a"}]', format: 'markdown' }],
  ['json_to_sql', { text: '[{"id":1,"name":"a"}]', dialect: 'postgres', table: 'demo' }],
  ['json_sort_by', { text: '[{"id":3},{"id":1,"x":null}]', field: 'id', order: 'asc' }],
  ['json_paths', { text: DOC }],
  ['json_pick_paths', { text: DOC, patterns: '__typename, items[*].secret', mode: 'omit' }],
]
calls.forEach(([name, args], i) => send({ jsonrpc: '2.0', id: 10 + i, method: 'tools/call', params: { name, arguments: args } }))
await waitFor(2 + calls.length)

for (const [i, [name]] of calls.entries()) {
  const res = responses.find(r => r.id === 10 + i)
  const body = res?.result?.content?.[0]?.text ?? ''
  const bad = !res || res.result?.isError || !body.trim()
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name}: ${body.replace(/\s+/g, ' ').slice(0, 70)}`)
}
child.kill()
