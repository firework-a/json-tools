#!/usr/bin/env node
// 清理构建产物
import { rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const targets = [
  'dist',
  'src-tauri/target',
  'src-tauri/gen',
]

for (const t of targets) {
  const p = resolve(root, t)
  if (existsSync(p)) {
    console.log(`🧹 Removing ${t}...`)
    rmSync(p, { recursive: true, force: true })
  }
}
console.log('✅ Clean done.')
