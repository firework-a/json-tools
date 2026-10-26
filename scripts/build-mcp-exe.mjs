#!/usr/bin/env node
// 把 MCP Server + CLI 编成免依赖单文件 exe，作为 Tauri resource 装进安装包。
// bundle.targets 目前只有 nsis，故固定 windows-x64；新增平台时同步改这里的 --target 与产物名。
// 用法：pnpm build:mcp:exe
import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const entry = relative(root, resolve(root, 'mcp-server/index.ts'))
const outfile = relative(root, resolve(root, 'src-tauri/binaries/json-tools-mcp.exe'))

const run = (args) => spawnSync(args.map(a => `"${a}"`).join(' '), {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

if (run(['bun', '--version']).status !== 0) {
  console.error('❌ 需要先安装 bun（https://bun.sh）：它是把 MCP 服务编成免依赖 exe 的构建工具。')
  process.exit(1)
}

const build = run(['bun', 'build', entry, '--compile', '--target=bun-windows-x64', '--outfile', outfile])
if (build.status !== 0) process.exit(build.status ?? 1)

if (!existsSync(resolve(root, outfile))) {
  console.error(`❌ 未生成产物：${outfile}`)
  process.exit(1)
}
console.log(`\n✅ ${outfile} ${(statSync(resolve(root, outfile)).size / 1024 / 1024).toFixed(1)} MB`)
