#!/usr/bin/env node
// 图标生成: 用一张 1024x1024 的 PNG 自动生成 Tauri 需要的各种尺寸图标
// 用法: node scripts/icon.mjs <source-png>
// 依赖: 需安装 @tauri-apps/cli (已安装为 devDep)
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = process.argv[2]

if (!source || !existsSync(resolve(source))) {
  console.error('❌ 请指定一张 1024x1024 的 PNG 图标作为参数')
  console.error('   用法: node scripts/icon.mjs ./my-icon.png')
  process.exit(1)
}

console.log(`\n▶ Generating icons from ${source}...\n`)
const child = spawn('pnpm', ['tauri', 'icon', source], {
  stdio: 'inherit',
  cwd: root,
  shell: process.platform === 'win32',
})
child.on('exit', (code) => {
  if (code === 0) console.log('\n✅ 图标已生成到 src-tauri/icons/')
  process.exit(code ?? 0)
})
