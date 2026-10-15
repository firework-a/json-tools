# Changelog

所有重要变更都会记录在这里。

## Unreleased

### Added
- **表格视图**：对象数组渲染为电子表格——自动下钻根下数组字段、列头排序、行过滤、双击单元格编辑（写回编辑器）、添加/删除行、列宽拖拽、拖拽重排列、右键隐藏列与恢复、列统计（类型/null 分布与数字求和/平均）、导出 Markdown / CSV（复制与保存文件）、粘性表头与斑马纹、渲染上限保护。
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
- **大文件打开提示**；表格渲染上限 2000 行保护。
- **无障碍**：图标按钮 aria-label 补齐、全局 :focus-visible 焦点环、空状态下一步动作（表格视图）。
- **ErrorBoundary**：组件崩溃显示错误详情与重新加载按钮，不再白屏。
- 状态栏新增光标位置（Ln/Col）；标题栏/窗口标题显示当前文件名（Tauri 原生同步）。
- 标签页支持中键关闭、双击重命名、拖拽重排；设置页新增树形默认展开层级与「粘贴自动修复」选项；设置页关于区新增快捷键列表。
- diff 编辑器与结果预览的字号/行号/自动换行跟随设置联动；编辑器空态 placeholder 提示。
- 工具箱结果一键写入编辑器；查询历史支持清空；表格 URL 值与树形视图 URL 值可点击打开。
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

### Notes
- 更新签名公钥已替换为真实密钥，GitHub Releases 签名更新链路就绪。
