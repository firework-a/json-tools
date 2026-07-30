#!/usr/bin/env node
// TypeScript 类型检查
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const child = spawn('npx', ['tsc', '--noEmit'], {
  stdio: 'inherit', cwd: root, shell: process.platform === 'win32',
})
child.on('exit', (code) => process.exit(code ?? 0))
