# Changelog

所有重要变更都会记录在这里。

## Unreleased

### Added
- 新增表格视图：对象数组渲染为电子表格（自动下钻根下数组字段、列头排序、行序号、点击行复制整行 JSON、粘性表头），工具栏与命令面板均可进入。
- 新增 Mock 数据生成器：从样例 JSON 结构或 JSON Schema（type/properties/enum/format）生成仿真数据，支持按字段名语义（人名/邮箱/URL/日期/UUID 等）生成，可选条数。
- 编辑器与表格视图新增空状态下一步动作：加载示例 JSON、打开文件、快捷键提示。
- 新增 NDJSON 工具：NDJSON ↔ JSON 数组互转（逐行解析、坏行精确定位报错），工具箱与命令面板均可进入。
- 表格视图新增单元格编辑：双击标量单元格原地编辑（数字/布尔/null 自动解析），Enter 提交、Esc 取消，写回编辑器；排序后编辑定位到原始行。
- 新增全局 Ctrl+V：焦点在编辑器外时把剪贴板内容直接粘贴到当前编辑器。
- 状态栏新增光标位置（Ln/Col）显示；标签页支持中键关闭、双击重命名。
- 表格视图支持导出 Markdown / CSV 表格（复制到剪贴板）。
- 新增 JSON Patch 生成：对比模式一键生成 RFC 6902 JSON Patch 并复制（显示变更处数）。
- 新增单元测试（vitest）：覆盖 JSON 修复/解析、NDJSON 互转、Mock 生成等核心工具（21 个用例），`pnpm test` 运行。
- 树形视图查询结果可一键写入编辑器（替换当前内容）。
- 新增内置示例 JSON（utils/sample.ts）。
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
- macOS 风格材质重构：SF 字体栈、系统蓝、毛玻璃弹层（命令面板/设置/速查表/toast/下拉）、大圆角、分层阴影、$ease-out 过渡曲线、全局 :focus-visible 焦点环。
- 粘贴大段 JSON 后视图恢复加固：多帧重试对齐到粘贴内容顶部，用户主动滚动时自动让位；对比页两侧编辑器同样生效。
- 滚动条整体加粗（6px→10px，编辑器 12px）并加深滑块颜色（含对比页与浅色主题），更容易拖动。
- UI 材质质感升级：工具栏渐变与分层阴影、分组控件内高光与按压态、树形面板渐变与投影、语言徽标悬停反馈。
- 浏览器（vite dev）环境下 TitleBar 不再因缺少 Tauri 环境而崩溃。
- 前端包名从 `dev-tools` 统一为 `json-tools`。
- 关于页版本号不再写死为静态文本。

### Notes
- 更新签名公钥已替换为真实密钥，GitHub Releases 签名更新链路就绪。
