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
- **数据处理工具箱扩充 6 项**：键名风格批量转换（`keyCase.ts`，camel/snake/kebab/Pascal 互转、撞名报错保护）、JSON 深度合并（`merge.ts`，数组替换/拼接/并集 + 标量冲突取侧）、敏感字段脱敏（`redact.ts`，键名 + 值格式双识别并输出命中清单）、时间戳批量互转（`timestamps.ts`，epoch ↔ 日期，ISO/本地）、表格导出（`tableExport.ts`，Markdown / HTML）、字段路径统计（`paths.ts`，路径次数 / 父级覆盖率 / 类型分布 / null 率 / 示例值）。每项含 vitest 用例，并同步为 MCP/CLI 工具（`json_keys_case` / `json_merge` / `json_redact` / `json_timestamps` / `json_table_export` / `json_paths`），MCP 工具数 13 → 19。
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
- **新增验证脚本**：`pnpm a11y`（`scripts/a11y.mjs`，无头 Chrome + CDP 逐屏跑 WCAG AA 对比度与可访问名检查，覆盖全部视图 × 深浅主题，不达标即退出码 1，可用 `--url` / `--stops` 收窄范围，需先 `pnpm preview` 或 `pnpm dev`）；`pnpm smoke` / `pnpm smoke:dist`（串联 `mcp-server/smoke*.mjs`：stdio 握手、工具清单断言、dist 产物与 7 个数据处理工具逐个实调；`smoke:dist` 只依赖 esbuild 产物，供 CI 使用）；`pnpm smoke:exe`（`mcp-server/smoke-exe.mjs`，对随安装包分发的 `src-tauri/binaries/json-tools-mcp.exe` 做同样的 stdio 握手 + 工具清单 + `json_keys_case` 实调，exe 不存在时自动跳过）。CI 已接入：前端 job 跑 `smoke:dist`，windows Tauri job 在 `build:mcp:exe` 之后跑 `smoke:exe`。
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
- **界面质感向 macOS 再推一步**：标题栏 + 工具栏 + 标签栏并为统一 chrome；标签改 Safari 式抬起文档页签（去掉蓝色下划线）；工具栏/分段选择统一为「中性抬起选中段」而非彩色底；工具箱与设置侧栏选中项改强调色圆角块；下拉菜单、设置面板、命令面板统一 vibrancy + sheet 入场动效与分层阴影；滚动条改 macOS overlay 风格（静止近乎隐形、悬停浮现，深浅主题各自适配）；开关改绿色 macOS 轨道、滑块改白色圆钮；焦点环统一 3px；新增间距/圆角/阴影/缓动 token（`variables.scss`）与 `press` / `sheet-in` / `hairline` mixin（`mixins.scss`）。
- **修复敏感脱敏误伤**：键名规则改按「词」匹配（复用 `splitWords`），`authors` / `tokenizer` / `passenger` 不再被打码，同时 `userPassword` / `accessToken` 这类驼峰键可正确命中；补防误伤与驼峰命中用例。
- **字段剔除 / 保留**（`pickPaths.ts`）：按路径批量删字段或只留白名单，与「字段路径统计」共用同一套路径记法（数组写 `[*]`、`*` 通配单层键名），`__typename` 这类不含点号的简写匹配任意层级同名键；同步为 MCP/CLI 工具 `json_pick_paths`，工具箱新增「字段剔除」，MCP 工具数 19 → 20。
- **SQL 导出**（`sqlExport.ts`）：对象数组 → `CREATE TABLE` + 批量 `INSERT`。列类型按实际值推断（整数 BIGINT / 浮点 DOUBLE / 布尔 / 日期时间 / 文本按最长值给 `VARCHAR(n)`，超 255 用 TEXT / 对象数组用 JSON），跨类型自动宽化（布尔混数值一律退回文本），全 null 的列跳过、缺失字段让列可空，字符串与内嵌 JSON 按 SQL 规则双写单引号转义；PostgreSQL / MySQL / SQLite 三种方言各自给标识符引号与类型名，表名缺省取数组所在字段名并过滤不安全字符。同步为 MCP/CLI 工具 `json_to_sql`，工具箱「数据处理」新增「SQL 导出」（方言 + 表名可选），MCP 工具数 20 → 21。
- **设置 → 工具箱**：新增一组默认值设置（键名风格目标、脱敏是否保留首尾、附加敏感键名列表、时间戳默认格式、表格导出默认格式、字段处理默认方式、常用字段路径、SQL 导出默认方言），进入对应工具时作为初始选项预填，改动即时同步。
- **脱敏支持键名列表**：`redactJson` 增加 `extraKeys`（按词与连写双归一，`openid` / `open_id` / `OPENID` 等价），工具箱与设置页用它输入，MCP 仍保留 `extraKeyPattern` 正则给高级用法。
- **修复浅色主题开关开启态不可见**：`[data-theme='light'] .set-switch` 覆盖了 `.on` 的绿色轨道，补 `.set-switch.on` 规则（macOS 绿）。
- **无障碍与对比度整改（脚本化审计驱动）**：新增 `pnpm a11y`（`scripts/a11y.mjs`，无头 Chrome + CDP）逐屏扫描——编辑/树、格式转换、生成代码、Schema、对比、工具箱 26 个工具逐个点开、下拉菜单展开态、设置面板、命令面板 × 深浅主题，按 WCAG AA（大字号 3:1 / 正文 4.5:1，半透明背景逐层合成后计算）报告不达标文本，并检查交互元素缺少可访问名；任一不达标即退出码 1。文字色改为主题级 CSS 变量 `--text-secondary` / `--text-muted` / `--accent-fill`（深浅各一套取值，Sass 单值变量做不到随主题切换）；修复浅色状态栏文字（原 1.4~3.0）、侧栏标签与占位符、Monaco 行号/占位符/括号高亮（占位符主题键此前写成 `editorPlaceholder.foreground`，实际注册名是 `editor.placeholder.foreground`，一直没生效）、树形视图 json-view 辅助符号（库的 `--w-rjv-*` 变量此前设在 DOM 中不存在的 `.w-json-view-theme` 上，一直没生效）等不达 WCAG AA 的取色；所有「强调色实心 + 白字」的控件（pill 组选中段、下拉菜单悬停项、更新横幅主按钮、安装确认按钮）统一改用 `--accent-fill`（原 `$blue` #4ea1f2 配白字仅 2.7:1）；下拉菜单选中勾号改 `color: inherit` 跟随所在行文字色，避免高亮行上 1.3:1；命令面板分组标题在深色下提到 5.2:1；开关与滑块补 `aria-label`，工具栏四个纯图标按钮（树形/主题/设置/置顶）补显式可访问名。全量扫描结果：深浅主题各 30+ 屏均 0 项不达标，且无缺少可访问名的交互元素。
- **弹层键盘可达性（焦点陷阱 + 组合框语义）**：新增 `src/hooks/useFocusTrap.ts`，命令面板与设置面板打开时焦点自动移入、Tab/Shift+Tab 在弹层内循环、关闭后归还给触发元素；两个弹层补 `role="dialog"` + `aria-modal` + 可访问名。命令面板改标准组合框模式：列表项 `tabindex="-1"` + `role="option"`/`aria-selected`，输入框 `role="combobox"` + `aria-activedescendant` 指向高亮项，键盘处理从输入框上提到面板容器。审计脚本发现的两处真实缺陷随之修掉：① 焦点一旦 Tab 到列表项，Esc 就失效（原来只在输入框上监听）；② 焦点陷阱的可聚焦选择器把 `tabindex="-1"` 的按钮也算进序列，导致 Tab 直接跳出弹层。
- **`pnpm a11y` 增加键盘阶段**：改用 CDP `Input.dispatchKeyEvent` 发真实按键（合成 KeyboardEvent 不会移动焦点），逐主题验证「焦点进入输入框 → 方向键移动高亮 → 连按 10 次 Tab 不逃出面板 → Esc 关闭并把焦点还给触发按钮」与设置面板同样的三条，共 16 项检查。
- **质感第二遍覆盖剩余控件**：树形面板搜索框/查询语言徽标/图标按钮统一内凹轨道 + 聚焦光环；JMESPath 速查浮层与设置面板、命令面板共用同一套 vibrancy + sheet 入场；pill 与动作按钮统一按压反馈（scale + 缓动曲线）。

### Notes
- 更新签名公钥已替换为真实密钥，GitHub Releases 签名更新链路就绪。
