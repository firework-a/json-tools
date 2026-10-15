# Changelog

所有重要变更都会记录在这里。

## Unreleased

### Added
- 新增「修复」按钮与命令面板命令（json.repair）：自定义修复规则 + jsonrepair 库兜底，覆盖截断 payload、缺失引号、尾逗号等复杂情况，一键把非标准 JSON 修复为合法 JSON。
- 树形视图查询新增 JSONPath 支持：查询语言徽标可点击切换 JMESPath / JSONPath，输入框占位与速查表随语言联动。
- 新增根目录 README，补充产品介绍、开发命令、发布流程和 GitHub Releases 更新说明。
- 设置的关于页新增真实版本显示和应用内检查更新入口。
- 接入 Tauri updater / process 插件，更新源指向 `firework-a/json-tools` 的 GitHub Releases。
- 新增 Tauri capability 配置，明确主窗口所需权限。
- 用户设置开始通过 Zustand persist 保存在本地，包括主题、编辑器设置、导出设置、模式和置顶状态。
- 新增 GitHub Actions release workflow，推送 `v*` tag 后自动构建 Windows 安装包并发布 GitHub Releases。
- 新增 GitHub Actions CI workflow，在推送和 PR 时执行前端类型检查、前端构建和 Rust 检查。
- 新增原生文件打开/保存/另存为：Tauri 走原生对话框和文件系统，记住文件路径并支持保存回原文件；浏览器预览降级为上传/下载。
- 新增文件拖拽打开，支持 Tauri 原生拖拽和浏览器 HTML5 拖拽。
- 标签页新增未保存标记（橙点），关闭未保存标签时弹出确认，避免误丢数据。
- 更新 README：移除 updater 公钥占位符说明，嵌入 `docs/page1.png` 应用截图并添加版本/平台/构建/许可证/技术栈徽章。
- 新增 MIT 许可证文件（LICENSE）。
- 新增常用快捷键：`Ctrl/Cmd+N` 新建、`Ctrl/Cmd+O` 打开、`Ctrl/Cmd+S` 保存、`Ctrl/Cmd+Shift+S` 另存为、`Ctrl/Cmd+B` 美化。

### Changed
- 粘贴大段 JSON 后视图恢复加固：多帧重试对齐到粘贴内容顶部，用户主动滚动时自动让位；对比页两侧编辑器同样生效。
- 滚动条整体加粗（6px→10px，编辑器 12px）并加深滑块颜色（含对比页与浅色主题），更容易拖动。
- UI 材质质感升级：工具栏渐变与分层阴影、分组控件内高光与按压态、树形面板渐变与投影、语言徽标悬停反馈。
- 浏览器（vite dev）环境下 TitleBar 不再因缺少 Tauri 环境而崩溃。
- 前端包名从 `dev-tools` 统一为 `json-tools`。
- 关于页版本号不再写死为静态文本。

### Notes
- 更新签名公钥已替换为真实密钥，GitHub Releases 签名更新链路就绪。
