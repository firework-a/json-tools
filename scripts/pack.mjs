#!/usr/bin/env node
// Tauri 打包脚本:
//   pnpm build:app                  # 打 release 安装包 (当前平台)
//   pnpm build:app debug            # 打 debug 包 (快速, 体积大, 不优化)
//   pnpm build:app -- --target x86_64-pc-windows-msvc  # 指定目标平台
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)

const debug = argv.includes('debug')

// 解析 --target
const args = ['tauri', 'build']
if (debug) args.push('--debug')

const targetIdx = argv.indexOf('--target')
if (targetIdx >= 0) {
  const triple = argv[targetIdx + 1]
  if (!triple) {
    console.error('❌ --target 后需要指定平台 triple, 例如 --target x86_64-pc-windows-msvc')
    process.exit(1)
  }
  args.push('--target', triple)
}

// 其余非 flag 参数附加 (保留给未来使用)
const extra = argv.filter((a, i) => {
  if (a === 'debug') return false
  if (a.startsWith('--')) return false
  if (i > 0 && argv[i - 1] === '--target') return false
  return true
})
args.push(...extra)

console.log(`\n▶ pnpm ${args.join(' ')}  (${debug ? 'debug' : 'release'})\n`)
const child = spawn('pnpm', args, {
  stdio: 'inherit',
  cwd: root,
  shell: process.platform === 'win32',
})
child.on('exit', (code) => {
  if (code === 0) {
    const kind = debug ? 'debug' : 'release'
    console.log(`\n✅ 打包完成! 产物在 src-tauri/target/${kind}/bundle/`)
    console.log('   运行 pnpm scripts:info 查看详情\n')
  }
  process.exit(code ?? 0)
})
