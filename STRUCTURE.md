# 项目结构说明

## 目录结构

```
src/
├── components/           # 应用 UI 组件
│   ├── TitleBar.tsx            # 无边框标题栏（macOS 交通灯）
│   ├── Toolbar.tsx             # 主工具栏（文件/JSON 变换/模式分组）
│   ├── TabBar.tsx              # 多标签页（双击重命名/拖拽重排/中键关闭）
│   ├── EditorArea.tsx          # 编辑区路由（edit/diff/convert/ts/schema/tools）
│   ├── CodeEditor.tsx          # Monaco 编辑器封装（粘贴自动格式化/回顶恢复）
│   ├── DiffEditor.tsx          # Monaco DiffEditor 封装
│   ├── TreeView.tsx            # 树形视图（JMESPath / JSONPath 双查询）
│   ├── ToolsPanel.tsx          # 工具箱（编解码/哈希/时间戳/Mock/NDJSON 等）
│   ├── SettingsPanel.tsx       # 设置浮层（外观/编辑器/导出/更新/关于）
│   ├── CommandPalette.tsx      # 命令面板（Ctrl+K）
│   ├── StatusBar.tsx           # 状态栏（统计/光标位置/快捷按钮）
│   ├── ErrorBoundary.tsx       # 全局错误边界
│   ├── ExportCanvas.tsx        # 代码图片导出画布
│   ├── CustomSelect.tsx        # 自定义下拉选择
│   ├── CopyButton.tsx / UpdateButton.tsx  # 小按钮组件
│   └── Icons.tsx               # SVG 图标集
├── hooks/
│   ├── useAutoUpdate.ts        # 应用内自动更新
│   └── useDebouncedValue.ts    # 防抖值
├── utils/
│   ├── json.ts                 # 基础 JSON 工具（解析/修复/统计/格式识别）
│   ├── jsonFormats.ts          # XML / TOML / CSV 互转
│   ├── jsonYaml.ts             # YAML 互转
│   ├── jsonSchema.ts           # JSON Schema 生成
│   ├── schemaValidator.ts      # Schema 校验
│   ├── jsonTransform.ts        # 键排序/扁平化/去空值
│   ├── keyCase.ts              # 键名风格批量互转（camel/snake/kebab/pascal）
│   ├── merge.ts                # 两份 JSON 深度合并
│   ├── redact.ts               # 敏感字段脱敏（键名 + 值格式双识别）
│   ├── timestamps.ts           # 递归时间戳 ↔ 日期互转
│   ├── tableExport.ts          # 对象数组导出 Markdown / HTML
│   ├── jsonDiffer.ts           # 行级 diff
│   ├── codeGen.ts / jsonToTs.ts # 多语言类型生成（quicktype）
│   ├── mockData.ts             # Mock 数据生成
│   ├── ndjson.ts               # NDJSON 互转
│   ├── table.ts                # 表格数据构建（MCP/CLI 的 json_table_extract 使用）
│   ├── sample.ts               # 内置示例 JSON
│   ├── encoding.ts             # Base64/URL/JWT/哈希/时间戳/进制
│   ├── shiki.ts / exportImage.ts # 高亮与图片导出
│   ├── files.ts                # 文件打开/保存（Tauri 原生 + 浏览器降级）
│   ├── updater.ts              # 版本获取与更新
│   └── index.ts                # 导出文件
├── styles/
│   ├── variables.scss          # Sass 变量（配色/圆角/阴影/字体）
│   ├── mixins.scss             # Sass Mixins（滚动条等）
│   └── main.scss               # 主样式文件
├── store.ts              # Zustand 全局状态（含工作区持久化）
├── updateStore.ts        # 更新流程状态
├── commands.ts           # 命令面板命令定义与搜索
├── editorRegistry.ts     # 编辑器实例注册表（跨组件联动）
├── monaco-entry.ts / monaco-setup.ts  # Monaco 按需打包与主题/Schema 配置
├── App.tsx               # 主应用组件（含树形面板拖拽调宽）
└── main.tsx              # 入口文件
```

## 分层说明

### 组件 (components/)
应用 UI 层：布局、编辑器封装、各模式页面与浮层。业务逻辑尽量下沉到 utils。

### 状态 (store.ts / updateStore.ts)
Zustand 全局状态；用户设置与工作区（标签页内容）通过 persist 持久化到本地。

### 工具函数 (utils/)
纯函数工具，处理业务逻辑，与 UI 分离；核心工具配有 vitest 单元测试（`*.test.ts`）。

### 命令 (commands.ts)
命令面板的全部命令定义与模糊搜索；最近打开文件动态生成命令。
