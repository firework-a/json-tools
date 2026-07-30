#!/usr/bin/env node
// 查看打包产物位置和项目基本信息
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const tauriConf = JSON.parse(readFileSync(resolve(root, 'src-tauri/tauri.conf.json'), 'utf8'))

console.log(`
📦 ${pkg.name}  v${pkg.version}
   productName : ${tauriConf.productName}
   identifier  : ${tauriConf.identifier}

🛠  可用脚本:
   pnpm dev              纯前端开发 (http://localhost:1420)
   pnpm tauri:dev        桌面端开发 (Tauri 窗口)
   pnpm build            只构建前端 (输出到 dist/)
   pnpm build:app        打包当前平台安装包 (release)
   pnpm build:app debug  打包当前平台 (debug, 快速)
   pnpm build:app --target x86_64-pc-windows-msvc
   pnpm typecheck        TypeScript 类型检查
   pnpm clean            清理构建产物
   pnpm icon <png>       用 1024x1024 PNG 生成 Tauri 所需图标
   pnpm scripts:info     查看此信息

📂 打包产物目录:
   src-tauri/target/release/bundle/
`);

[['msi',  'Windows MSI 安装包'],
 ['nsis', 'Windows NSIS 安装包'],
 ['dmg',  'macOS DMG 镜像'],
 ['app',  'macOS .app 应用'],
 ['deb',  'Linux DEB 包'],
 ['appimage', 'Linux AppImage']].forEach(([dir, desc]) => {
  const p = resolve(root, 'src-tauri/target/release/bundle', dir)
  if (existsSync(p)) console.log(`   ✅ ${desc}: ${p}`)
})
