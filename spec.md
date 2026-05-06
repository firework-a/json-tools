# 开发者工具箱

一个使用 Rust + Tauri + React 构建的跨平台开发者工具桌面应用。

## 功能特性

- **JSON格式化**: 支持语法高亮，树形结构展示
- **JSON对比**: 左右分屏对比，差异高亮显示（新增/删除/修改）
- **JSON压缩/转义**: 压缩、转义、解转义、Base64编解码

## 技术栈

### 后端
- **Rust**: 最新稳定版本
- **Tauri 2.x**: 桌面应用框架
- **serde_json**: JSON数据处理库

### 前端
- **React 18**: UI框架
- **TypeScript**: 类型安全
- **Vite 5**: 构建工具
- **Zustand**: 状态管理

### UI与样式
- **自定义CSS + Sass**: 样式管理
- **参考Lingma IDE**: 保持界面风格一致
- **深色主题**: 现代化IDE风格

### 代码编辑器
- **@uiw/react-codemirror**: CodeMirror React封装
- **@codemirror/lang-json**: JSON语言支持
- **@uiw/codemirror-theme-vscode**: VSCode主题

### JSON处理
- **serde_json (Rust)**: 后端JSON处理
- **diff**: 差异对比库

## 项目结构

```
dev-tools/
├── src-tauri/              # Tauri后端
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   └── tauri.conf.json
── src/                    # React前端
│   ├── components/         # React组件
│   │   ├── Layout.tsx
│   │   ├── JsonFormatter.tsx
│   │   ├── JsonComparator.tsx
│   │   └── JsonCompressor.tsx
│   ├── styles/             # Sass样式文件
│   │   ├── variables.scss
│   │   ├── mixins.scss
│   │   └── main.scss
│   ├── App.tsx
│   └── main.tsx
├── public/                 # 静态资源
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式（仅前端）
pnpm dev

# Tauri开发模式（前端+后端）
pnpm tauri dev

# 构建生产版本
pnpm tauri build
```

## 构建配置

- **包管理器**: pnpm (>= 7)
- **Vite端口**: 1420
- **TypeScript**: ES2020, Strict模式
- **Sass**: 使用 @use 语法（已弃用 @import）

## UI设计要点

- 参考Lingma IDE深色主题风格
- 自定义Sass变量系统
- 响应式布局设计
- 现代化滚动条样式
- 按钮和标签页交互动效
