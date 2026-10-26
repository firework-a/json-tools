// 随安装包分发的单文件 exe 的 stdio 冒烟测试（不依赖 Node/tsx，走 bun 编译产物）
// 用法：node mcp-server/smoke-exe.mjs [exe 路径]
// 产物不存在时跳过（退出 0），因为 exe 需要本机 bun，CI 上由 build:mcp:exe 单独保证。
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const EXE = process.argv[2] || join('src-tauri', 'binaries', 'json-tools-mcp.exe')
if (!existsSync(EXE)) {
  console.log(`跳过：${EXE} 不存在（先跑 pnpm build:mcp:exe）`)
  process.exit(0)
}

const child = spawn(EXE, [], { stdio: ['pipe', 'pipe', 'pipe'] })
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
child.stderr.on('data', d => process.stderr.write(d))

const send = obj => child.stdin.write(JSON.stringify(obj) + '\n')
const waitFor = async (id, timeout = 20000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const hit = responses.find(r => r.id === id)
    if (hit) return hit
    await new Promise(r => setTimeout(r, 100))
  }
  throw new Error(`等待 id=${id} 超时`)
}

send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke-exe', version: '0' } } })
const init = await waitFor(1)
console.log('server:', init.result?.serverInfo?.name, init.result?.serverInfo?.version)

send({ jsonrpc: '2.0', method: 'notifications/initialized' })
send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
const list = await waitFor(2)
const names = (list.result?.tools || []).map(t => t.name)
console.log('tools:', names.length)

send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'json_keys_case', arguments: { text: '{"user_name":"a"}', style: 'camel' } } })
const call = await waitFor(3)
const out = JSON.parse(call.result.content[0].text)
console.log('json_keys_case:', JSON.stringify(out))

const expected = ['json_keys_case', 'json_merge', 'json_redact', 'json_timestamps', 'json_table_export', 'json_to_sql', 'json_paths', 'json_pick_paths']
if (init.result?.serverInfo?.name !== 'json-tools') throw new Error('服务名不符')
// 不断言具体条数（加工具时容易忘改），只要求打包出的 exe 至少不比源码少、且关键工具都在
if (names.length < expected.length + 12) throw new Error(`工具数异常偏少：${names.length}`)
for (const n of expected) if (!names.includes(n)) throw new Error(`缺少工具 ${n}`)
if (!out.userName) throw new Error('json_keys_case 结果不符')
console.log('✅ exe stdio 冒烟通过')
child.kill()
