# @firework-a/json-tools-mcp

JSON Tools MCP Server —— 修复/格式化/校验/转换/变换/diff/Mock/统计/查询/表格提取/Schema 生成/智能分析等 13 个 JSON 工具，通过 [Model Context Protocol](https://modelcontextprotocol.io) 暴露给 AI 助手（Claude Desktop / Codex / Cursor 等）。

## 使用

在 MCP 客户端配置（如 `claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "json-tools": {
      "command": "npx",
      "args": ["@firework-a/json-tools-mcp"]
    }
  }
}
```

首次使用 npx 会自动下载。无需手动启动——AI 客户端会在需要时自动拉起本服务（stdio 通信）。

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
pnpm install       # 仓库根目录
pnpm build:mcp     # esbuild 打包为自包含单文件 dist/index.js
pnpm mcp           # 本地运行（stdio）
```

逻辑复用仓库 `src/utils/` 下的纯函数模块，与 [JSON Tools 桌面应用](https://github.com/firework-a/json-tools)完全一致。
