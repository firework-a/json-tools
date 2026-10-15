// MCP server 冒烟测试 2：json_insights（score）+ json_validate + json_query
import { spawn } from 'node:child_process'

const child = spawn('npx', ['tsx', 'mcp-server/index.ts'], { shell: true, stdio: ['pipe', 'pipe', 'pipe'] })
let buf = ''
const responses = []
child.stdout.on('data', d => {
  buf += d.toString()
  let idx
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim()
    buf = buf.slice(idx + 1)
    if (line) {
      try { responses.push(JSON.parse(line)) } catch { /* ignore */ }
    }
  }
})

const send = obj => child.stdin.write(JSON.stringify(obj) + '\n')
const wait = ms => new Promise(r => setTimeout(r, ms))

send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke2', version: '0' } } })
await wait(1500)
send({ jsonrpc: '2.0', method: 'notifications/initialized' })
send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'json_insights', arguments: { text: '{"a":null,"b":null,"c":1}' } } })
send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'json_validate', arguments: { text: '{"a":1}' } } })
send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'json_query', arguments: { text: '{"users":[{"name":"Alice"}]}', path: '$.users[*].name' } } })
await wait(2500)

const insights = responses.find(r => r.id === 2)
const validate = responses.find(r => r.id === 3)
const query = responses.find(r => r.id === 4)
const ip = JSON.parse(insights?.result?.content?.[0]?.text || '{}')
console.log('insights score:', ip.score, '| issues:', ip.issues?.length)
console.log('validate:', validate?.result?.content?.[0]?.text?.slice(0, 60))
console.log('query:', query?.result?.content?.[0]?.text?.slice(0, 60))
child.kill()
process.exit(0)
