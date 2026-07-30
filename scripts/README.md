# 脚本目录

跨平台 Node.js 脚本，通过 `pnpm <name>` 调用。

| 脚本 | 用途 |
|------|------|
| `pnpm dev` | 启动前端开发服务器 (vite, http://localhost:1420) |
| `pnpm tauri:dev` | 启动 Tauri 桌面开发模式（含热更新） |
| `pnpm build` | 只构建前端静态产物 (输出到 `dist/`) |
| `pnpm build:app` | 打当前平台 release 安装包 |
| `pnpm build:app debug` | 打 debug 包（快速，体积大） |
| `pnpm build:app -- --target <triple>` | 打指定平台安装包（注意前一个 `--`） |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm clean` | 清理所有构建产物 |
| `pnpm icon <png>` | 用 1024×1024 PNG 生成 Tauri 各尺寸图标 |
| `pnpm scripts:info` | 查看项目信息与打包产物位置 |

> 注：传递参数给脚本时需在脚本名后加 `--`，如 `pnpm build:app -- --target x86_64-pc-windows-msvc`。

## 常用打包目标 (--target)

| Triple | 平台 |
|--------|------|
| `x86_64-pc-windows-msvc` | Windows x64 |
| `aarch64-pc-windows-msvc` | Windows ARM |
| `x86_64-apple-darwin` | macOS Intel |
| `aarch64-apple-darwin` | macOS Apple Silicon |
| `x86_64-unknown-linux-gnu` | Linux x64 |

跨平台打包需要额外安装 Rust 交叉编译工具链。

## 打包产物位置

- Windows: `src-tauri/target/release/bundle/msi/` 和 `nsis/`
- macOS: `src-tauri/target/release/bundle/dmg/` 和 `macos/`
- Linux: `src-tauri/target/release/bundle/deb/` 和 `appimage/`
