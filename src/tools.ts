// 工具箱清单：工具元数据的唯一来源（ToolsPanel 渲染与命令面板覆盖测试共用）

export type ToolId =
  | 'sort' | 'flatten' | 'unflatten' | 'removeEmpty' | 'dedup'
  | 'keyCase' | 'merge' | 'redact' | 'ts' | 'tableExport' | 'sql' | 'paths' | 'pick' | 'sortByField'
  | 'base64' | 'url' | 'jwt' | 'hash' | 'timestamp' | 'numbase' | 'mock' | 'ndjson' | 'insights'

export interface ToolMeta { id: ToolId; label: string; group: string; json?: boolean }
export const TOOLS: ToolMeta[] = [
  { id: 'sort', label: '键排序', group: 'JSON 变换', json: true },
  { id: 'flatten', label: '扁平化', group: 'JSON 变换', json: true },
  { id: 'unflatten', label: '扁平还原', group: 'JSON 变换', json: true },
  { id: 'removeEmpty', label: '去空值', group: 'JSON 变换', json: true },
  { id: 'dedup', label: '去重', group: 'JSON 变换', json: true },
  { id: 'keyCase', label: '键名风格', group: '数据处理', json: true },
  { id: 'merge', label: '深度合并', group: '数据处理', json: true },
  { id: 'redact', label: '敏感脱敏', group: '数据处理', json: true },
  { id: 'ts', label: '时间戳互转', group: '数据处理', json: true },
  { id: 'tableExport', label: '表格导出', group: '数据处理', json: true },
  { id: 'sql', label: 'SQL 导出', group: '数据处理', json: true },
  { id: 'paths', label: '字段路径', group: '数据处理', json: true },
  { id: 'pick', label: '字段剔除', group: '数据处理', json: true },
  { id: 'sortByField', label: '数组排序', group: '数据处理', json: true },
  { id: 'base64', label: 'Base64', group: '编解码' },
  { id: 'url', label: 'URL 编码', group: '编解码' },
  { id: 'jwt', label: 'JWT 解析', group: '编解码' },
  { id: 'hash', label: '哈希', group: '编解码' },
  { id: 'timestamp', label: '时间戳', group: '其他' },
  { id: 'numbase', label: '进制转换', group: '其他' },
  { id: 'mock', label: 'Mock 数据', group: '其他', json: true },
  { id: 'ndjson', label: 'NDJSON', group: '其他', json: true },
  { id: 'insights', label: '智能分析', group: '其他', json: true },
]
