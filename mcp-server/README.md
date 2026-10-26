# json-tools-mcp

JSON Tools 的 MCP Server + CLI 入口 —— 修复/格式化/校验/转换/变换/diff/Mock/统计/查询/表格提取/Schema 生成/智能分析等 13 个 JSON 工具，通过 [Model Context Protocol](https://modelcontextprotocol.io) 暴露给 AI 助手（Claude Desktop / Codex / Cursor 等）。

> 不发布到 npm：随桌面安装包以单文件 `json-tools-mcp.exe` 分发，用户无需 Node.js、无需打开应用。

## 使用（装了 JSON TOOLS 的用户）

设置 → MCP 页会显示本机 exe 的绝对路径并一键复制配置，手工填就是：

```json
{
  "mcpServers": {
    "json-tools": {
      "command": "C:\\Program Files\\JSON TOOLS\\binaries\\json-tools-mcp.exe"
    }
  }
}
```

无需手动启动——AI 客户端会在需要时自动拉起它（stdio 通信）。直接运行它会看到它卡在等标准输入，这是正常现象。

## 命令行用法

同一个 exe 也是普通 CLI：

```bash
json-tools-mcp.exe list                              # 列出 13 个工具
json-tools-mcp.exe run json_repair --text broken.json # 值传文件路径自动读内容
json-tools-mcp.exe run json_format --text data.json --indent 4
json-tools-mcp.exe run json_diff --left a.json --right b.json
echo '{a:1,}' | json-tools-mcp.exe run json_repair    # 管道灌入主字段
json-tools-mcp.exe run json_query --help              # 查看某工具的参数
```

参数校验与 MCP 走同一套 zod schema（同一份默认值），退出码 0 成功 / 1 工具报错 / 2 用法错误。

## 工具（13 个）

| 工具 | 说明 |
| --- | --- |
| `json_repair` | 修复非标准 JSON（注释/单引号/尾逗号/截断） |
| `json_format` | 格式化或压缩 JSON |
| `json_validate` | 语法校验 + 可选 Schema 校验 + 统计 |
| `json_convert` | YAML / XML / TOML / CSV / NDJSON 互转 |
| `json_ndjson` | NDJSON ↔ JSON 数组互转 |
| `json_transform` | 键排序 / 扁平化 / 去 null / 去重 |
| `json_diff` | 对比两个 JSON 的差异 |
| `json_mock` | 从样例或 Schema 生成 Mock 数据 |
| `json_stats` | 键数 / 深度 / 大小 / 行数统计 |
| `json_query` | JSONPath / JMESPath 查询 |
| `json_table_extract` | 提取对象数组为表格行列 |
| `json_to_schema` | 从样例推断 JSON Schema |
| `json_insights` | 智能分析：结构摘要 / 质量评分 / 建议 |

## 开发

```bash
pnpm install        # 仓库根目录
pnpm mcp            # 源码直接跑 stdio server（tsx）
pnpm build:mcp      # esbuild → dist/index.js（自包含 JS，本地/调试用）
pnpm build:mcp:exe  # bun --compile → src-tauri/binaries/json-tools-mcp.exe（进安装包）
node mcp-server/smoke.mjs   # stdio 冒烟测试
```

- `tools.ts` 是 13 个工具的唯一实现源，MCP 注册与 CLI 子命令都从这里遍历。
- 逻辑复用仓库 `src/utils/` 下的纯函数模块，与 [JSON Tools 桌面应用](https://github.com/firework-a/json-tools)完全一致。
