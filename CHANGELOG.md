# Changelog

所有重要变更都会记录在这里。

## Unreleased

### Added
- **JSON 修复**：工具栏「修复」按钮 + 命令面板 + 状态栏格式错误一键修复入口，自定义规则 + jsonrepair 库兜底。
- **JSONPath 查询**：树形视图 JMESPath / JSONPath 双语言切换（持久化）、速查表联动、历史记录与清空、查询结果一键写回编辑器。
- **Mock 数据生成器**：从样例 JSON 或 JSON Schema 生成仿真数据（人名/邮箱/URL/日期/UUID/角色/状态等语义），可选条数。
- **JSON Patch**：对比模式一键生成 RFC 6902 Patch 并复制；从剪贴板读取 Patch 应用到左侧文档。
- **NDJSON 工具**：NDJSON ↔ JSON 数组互转，坏行精确定位报错。
- **Schema 实时校验**：Schema 模式「应用校验」把 Schema 接入编辑器（Monaco diagnostics 实时标出不符合项）。
- **格式转换双向**：新增反向方向 YAML / XML / TOML / CSV → JSON，顶栏方向切换、输入自动重算；转义 JSON 字符串输入自动深度还原。
- **全局 Ctrl+V**：编辑器外直接粘贴剪贴板内容到当前编辑器。
- **最近打开文件**：命令面板直达（Tauri 原生路径，持久化最近 10 条）。
- **工作区状态恢复**：标签页内容跨启动持久化（超大内容跳过，恢复后保留未保存标记）。
- **数据处理工具箱扩充 5 项**：键名风格批量转换（`keyCase.ts`，camel/snake/kebab/Pascal 互转、撞名报错保护）、JSON 深度合并（`merge.ts`，数组替换/拼接/并集 + 标量冲突取侧）、敏感字段脱敏（`redact.ts`，键名 + 值格式双识别并输出命中清单）、时间戳批量互转（`timestamps.ts`，epoch ↔ 日期，ISO/本地）、表格导出（`tableExport.ts`，Markdown / HTML）。每项含 vitest 用例，并同步为 MCP/CLI 工具（`json_keys_case` / `json_merge` / `json_redact` / `json_timestamps` / `json_table_export`），MCP 工具数 13 → 18。
- **新增 MCP Server + CLI**（`mcp-server/`）：13 个核心 JSON 工具（修复/格式化/校验/转换/变换/diff/Mock/统计/查询/表格提取/Schema 生成/智能分析）通过 Model Context Protocol 暴露给 AI 助手，同一个程序也是命令行工具（`list` / `run <tool> --text data.json` / `--help`）；参数校验与默认值共用 `tools.ts` 一份定义，逻辑复用 src/utils 纯函数与桌面端一致。
- **新增智能分析功能**（工具箱「智能分析」）：本地规则引擎对 JSON 做结构摘要、字段类型统计、数据质量检查（类型混杂/null 占比/深嵌套/空数组对象）与优化建议，输出可读分析报告，离线无需 API key。
- **大文件打开提示**。
- **无障碍**：图标按钮 aria-label 补齐、全局 :focus-visible 焦点环。
- **ErrorBoundary**：组件崩溃显示错误详情与重新加载按钮，不再白屏。
- 状态栏新增光标位置（Ln/Col）；标题栏/窗口标题显示当前文件名（Tauri 原生同步）。
- 标签页支持中键关闭、双击重命名、拖拽重排；Ctrl+Tab / Ctrl+1-9 标签切换快捷键；设置页新增树形默认展开层级与「粘贴自动修复」选项；设置页关于区新增快捷键列表。
- diff 编辑器与结果预览的字号/行号/自动换行跟随设置联动；编辑器空态 placeholder 提示。
- 工具箱结果一键写入编辑器；查询历史支持清空；树形视图 URL 值可点击打开。
- 生成代码新增 Kotlin 语言。
- 新增单元测试（vitest）：覆盖 JSON 修复/解析、NDJSON 互转、Mock 生成、表格构建、命令搜索等核心工具（31 个用例），`pnpm test` 运行；CI 新增测试步骤。
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
- 树形面板宽度可拖拽调整（260~560px，持久化）；查询语言与最近文件持久化。
- 粘贴大段 JSON 后视图恢复加固：多帧重试对齐到粘贴内容顶部，用户主动滚动时自动让位；对比页两侧编辑器同样生效。
- 滚动条整体加粗（6px→10px，编辑器 12px）并加深滑块颜色（含对比页与浅色主题），更容易拖动。
- UI 材质质感升级：工具栏渐变与分层阴影、分组控件内高光与按压态、树形面板渐变与投影、语言徽标悬停反馈。
- 浏览器（vite dev）环境下 TitleBar 不再因缺少 Tauri 环境而崩溃。
- 前端包名从 `dev-tools` 统一为 `json-tools`。
- 关于页版本号不再写死为静态文本。
- MCP 分发方式改为随安装包走单文件 exe（`bun --compile` → 安装目录 `binaries/json-tools-mcp.exe`），用户无需 Node.js 也无需打开应用；移除 npm 发布 workflow 与 `@firework-a/json-tools-mcp` 包配置。「设置 → MCP」改为自动读取本机安装路径生成客户端配置，并补充 CLI 用法。构建链路新增 bun 依赖（`pnpm build:mcp:exe`，`tauri:dev`/`build:app`/CI 已串好）。安装包体积相应增大（实测 debug 包 ~38MB，含 83MB 未压缩 exe）。
- **移除应用内「表格」视图**（GridView、工具栏按钮、命令面板项、状态栏模式与相关样式）；`src/utils/table.ts` 与 `json_table_extract` 工具保留给 MCP/CLI 使用，智能分析对对象数组的建议改为导出 CSV / JSONPath 取值。

### Notes
- 更新签名公钥已替换为真实密钥，GitHub Releases 签名更新链路就绪。
