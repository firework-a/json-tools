// 编译产物冒烟测试：node mcp-server/dist/index.js（bin 入口，模拟 npm 全局安装后的调用）
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
    if (line) {
      try { responses.push(JSON.parse(line)) } catch { /* ignore */ }
    }
  }
})
child.stderr.on('data', d => console.error('[stderr]', d.toString().slice(0, 200)))

const send = obj => child.stdin.write(JSON.stringify(obj) + '\n')
const wait = ms => new Promise(r => setTimeout(r, ms))

send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke-dist', version: '0' } } })
await wait(1500)
send({ jsonrpc: '2.0', method: 'notifications/initialized' })
send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'json_repair', arguments: { text: '{ a: 1, }' } } })
send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'json_insights', arguments: { text: '{"a":null,"b":1}' } } })
await wait(2000)

const list = responses.find(r => r.id === 2)
const repair = responses.find(r => r.id === 3)
const insights = responses.find(r => r.id === 4)
console.log('tools:', list?.result?.tools?.length)
console.log('repair:', repair?.result?.content?.[0]?.text?.slice(0, 40))
const ip = JSON.parse(insights?.result?.content?.[0]?.text || '{}')
console.log('insights score:', ip.score)
child.kill()
process.exit(0)
