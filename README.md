# JSON 工具箱

JSON 工具箱是一个面向开发者的桌面 JSON 工作台，基于 Tauri 2、React 18 和 Monaco Editor 构建。它把常见的 JSON 处理流程放在一个离线本地应用里，适合日常格式化、转换、对比、Schema 校验、类型生成和截图分享。

## 核心能力

- JSON 格式化、压缩、转义和解转义
- 多标签页编辑，支持文件打开、保存、另存为和未保存状态提示
- 文件拖拽打开，支持 `.json` / `.txt` / `.yaml` / `.yml`
- JSON 树形结构查看
- JSON Diff 对比
- YAML / XML / TOML / CSV 格式转换
- JSON Schema 生成与校验
- TypeScript 等多语言类型生成
- 代码图片导出
- 深色 / 浅色主题、字体、缩进、自动换行等编辑器设置
- GitHub Releases 更新检查

## 快捷键

| 操作 | 快捷键 |
| --- | --- |
| 新建标签页 | `Ctrl/Cmd + N` |
| 打开文件 | `Ctrl/Cmd + O` |
| 保存 | `Ctrl/Cmd + S` |
| 另存为 | `Ctrl/Cmd + Shift + S` |
| 美化 JSON | `Ctrl/Cmd + B` |

## 安装与更新

正式版本通过 GitHub Releases 分发：

- Releases: https://github.com/firework-a/json-tools/releases
- 更新元数据: https://github.com/firework-a/json-tools/releases/latest/download/latest.json

应用内的更新入口位于 `设置 -> 关于 -> 检查更新`。更新功能依赖 Tauri 的签名更新包。

### 生成更新签名密钥

首次发布前需要生成一对签名密钥：

```bash
pnpm tauri signer generate -w ~/.tauri/json-tools.key
```

命令会输出：

- `Public key`：写入 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey`。
- `Private key`：配置到 GitHub Repository Secrets 的 `TAURI_SIGNING_PRIVATE_KEY`。
- `Private key password`：配置到 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`。

当前仓库里保留了占位公钥 `TAURI_UPDATER_PUBLIC_KEY_PLACEHOLDER`，在替换为真实公钥之前，生产更新检查不会完成可用的签名校验。私钥和密码不要提交到仓库。

## 开发环境

需要：

- Node.js LTS
- pnpm
- Rust stable
- Tauri 2 所需系统依赖

安装依赖：

```bash
pnpm install
```

前端开发：

```bash
pnpm dev
```

桌面应用开发：

```bash
pnpm tauri dev
```

类型检查：

```bash
pnpm typecheck
```

前端构建：

```bash
pnpm build
```

桌面安装包构建：

```bash
pnpm build:app
```

调试安装包构建：

```bash
pnpm build:app debug
```

指定 Tauri target：

```bash
pnpm build:app --target x86_64-pc-windows-msvc
```

## 发布流程

1. 更新 `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 的版本号。
2. 更新 `CHANGELOG.md`。
3. 确认 `src-tauri/tauri.conf.json` 里配置了真实 updater 公钥。
4. 在 GitHub 仓库 Secrets 中设置 `TAURI_SIGNING_PRIVATE_KEY` 和 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`。
5. 推送 `v*` tag，或在 GitHub Actions 手动运行 `release` workflow。
6. workflow 会构建 Windows MSI / NSIS 安装包，并把安装包、签名文件和 `latest.json` 上传到 `firework-a/json-tools` 的 GitHub Release。
7. 打开已安装旧版本，在 `设置 -> 关于` 中检查更新。

本地也可以运行 `pnpm build:app` 生成安装包和 updater artifacts，用于发布前验证。

## 项目结构

```text
json-tools/
├── src/                    # React 前端
│   ├── components/          # 应用 UI 组件
│   ├── styles/              # Sass 样式
│   └── utils/               # JSON、导出、更新等工具逻辑
├── src-tauri/               # Tauri 后端和打包配置
│   ├── capabilities/        # Tauri 权限配置
│   ├── icons/               # 应用图标
│   ├── src/                 # Rust 入口
│   └── tauri.conf.json      # Tauri 应用配置
├── scripts/                 # 打包和维护脚本
├── CHANGELOG.md             # 版本更新说明
├── package.json
└── README.md
```

## 已知限制

- XML / CSV / TOML 等格式转换可能存在结构信息损失，不保证可逆。
- 超大 JSON 的树形渲染、Diff 和图片导出仍需要进一步性能保护。
- 更新功能使用 GitHub Releases，没有独立更新服务器。
- Windows 签名、macOS 签名和 notarization 需要在正式商业分发前补齐。

## 后续路线

短期重点：

- 完善 GitHub Actions 发布流程
- 增加核心 JSON 工具函数测试
- 增加最近文件和更完整的工作区恢复
- 增强错误提示和大文件处理体验
- 完成安装包签名和发布检查清单
