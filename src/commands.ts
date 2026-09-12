import { useAppStore } from './store'
import { useUpdateStore } from './updateStore'
import { formatJson, compressJson, escapeJson, unescapeJson, copyToClipboard } from './utils/json'
import { sortJsonKeys, flattenJson, unflattenJson, removeEmptyValues } from './utils/jsonTransform'
import { openTextFile, saveTextFileAs, writeTextFile, basename } from './utils/files'
import { foldAllEditors, unfoldAllEditors } from './editorRegistry'

export type CommandGroup = '文件' | 'JSON 变换' | '视图' | '模式' | '工具箱' | '其他'

export interface AppCommand {
  id: string
  label: string
  group: CommandGroup
  keywords?: string
  hint?: string
  run: () => void | Promise<void>
}

const s = () => useAppStore.getState()

/** 对编辑器当前内容执行一次 JSON 变换并写回 */
const applyTransform = (
  fn: (c: string) => { result: string; error: string | null },
  lang: 'json' | 'plaintext' = 'json',
  doneMsg = '已完成',
) => {
  const st = s()
  if (!st.content.trim()) { st.showToast('编辑器内容为空'); return }
  const { result, error } = fn(st.content)
  if (error) { st.showToast(error); return }
  st.setContent(result)
  st.setEditorLanguage(lang)
  st.showToast(doneMsg)
}

const switchMode = (m: 'edit' | 'diff' | 'convert' | 'ts' | 'schema' | 'tools') => s().setMode(m)

const openTool = (tool: string) => {
  s().setToolsTool(tool)
  s().setMode('tools')
}

export const COMMANDS: AppCommand[] = [
  // 文件
  { id: 'file.new', label: '新建文件', group: '文件', keywords: 'new tab 新建 标签', run: () => s().newTab() },
  { id: 'file.open', label: '打开文件', group: '文件', keywords: 'open 打开 文件', hint: 'Ctrl+O', run: async () => {
    const f = await openTextFile()
    if (f) s().openLoadedFile(f)
  } },
  { id: 'file.save', label: '保存', group: '文件', keywords: 'save 保存', hint: 'Ctrl+S', run: async () => {
    const st = s()
    const tab = st.tabs.find(t => t.id === st.activeTabId)
    if (!st.content.trim()) { st.showToast('没有可保存的内容'); return }
    if (tab?.filePath) {
      try { await writeTextFile(tab.filePath, st.content); st.markSaved(tab.filePath, tab.name); st.showToast('已保存') }
      catch (e) { st.showToast('保存失败: ' + (e instanceof Error ? e.message : String(e))) }
      return
    }
    const path = await saveTextFileAs(st.content, (tab?.name ?? 'Untitled') + '.json')
    if (path) { st.markSaved(path, basename(path)); st.showToast('已保存') }
  } },
  { id: 'file.saveAs', label: '另存为', group: '文件', keywords: 'save as 另存', hint: 'Ctrl+Shift+S', run: async () => {
    const st = s()
    const tab = st.tabs.find(t => t.id === st.activeTabId)
    if (!st.content.trim()) { st.showToast('没有可保存的内容'); return }
    const path = await saveTextFileAs(st.content, (tab?.name ?? 'Untitled') + '.json')
    if (path) { st.markSaved(path, basename(path)); st.showToast('已保存') }
  } },

  // JSON 变换
  { id: 'json.beautify', label: '美化 JSON', group: 'JSON 变换', keywords: 'format beautify 美化 格式化', hint: 'Ctrl+B', run: () => applyTransform(c => formatJson(c), 'json', '已美化') },
  { id: 'json.compress', label: '压缩 JSON', group: 'JSON 变换', keywords: 'compress minify 压缩', run: () => applyTransform(compressJson, 'plaintext', '已压缩') },
  { id: 'json.escape', label: '转义', group: 'JSON 变换', keywords: 'escape 转义', run: () => applyTransform(escapeJson, 'plaintext', '已转义') },
  { id: 'json.unescape', label: '反转义', group: 'JSON 变换', keywords: 'unescape 反转义', run: () => applyTransform(unescapeJson, 'json', '已反转义') },
  { id: 'json.sortAsc', label: '按键升序排序', group: 'JSON 变换', keywords: 'sort 排序 键', run: () => applyTransform(c => sortJsonKeys(c, 'asc'), 'json', '已升序排序') },
  { id: 'json.sortDesc', label: '按键降序排序', group: 'JSON 变换', keywords: 'sort desc 排序 降序', run: () => applyTransform(c => sortJsonKeys(c, 'desc'), 'json', '已降序排序') },
  { id: 'json.flatten', label: '扁平化', group: 'JSON 变换', keywords: 'flatten 扁平 展开', run: () => applyTransform(flattenJson, 'json', '已扁平化') },
  { id: 'json.unflatten', label: '扁平还原', group: 'JSON 变换', keywords: 'unflatten 还原 嵌套', run: () => applyTransform(unflattenJson, 'json', '已还原') },
  { id: 'json.removeNull', label: '去除 null 值', group: 'JSON 变换', keywords: 'remove null 空值', run: () => applyTransform(c => removeEmptyValues(c, true), 'json', '已去除 null') },
  { id: 'json.removeEmpty', label: '去除所有空值', group: 'JSON 变换', keywords: 'remove empty 空值 空字符串', run: () => applyTransform(c => removeEmptyValues(c, false), 'json', '已去除空值') },
  { id: 'json.copyCompact', label: '复制压缩后的 JSON', group: 'JSON 变换', keywords: 'copy 复制 压缩', run: async () => {
    const st = s()
    if (!st.content.trim()) { st.showToast('编辑器内容为空'); return }
    const { result, error } = compressJson(st.content)
    if (error) { st.showToast(error); return }
    st.showToast(await copyToClipboard(result) ? '已复制压缩 JSON' : '复制失败')
  } },

  // 视图
  { id: 'view.fold', label: '折叠全部', group: '视图', keywords: 'fold collapse 折叠', run: () => foldAllEditors() },
  { id: 'view.unfold', label: '展开全部', group: '视图', keywords: 'unfold expand 展开', run: () => unfoldAllEditors() },
  { id: 'view.tree', label: '切换树形视图', group: '视图', keywords: 'tree 树 面板', run: () => s().setTreeOpen(!s().treeOpen) },
  { id: 'view.theme', label: '切换主题', group: '视图', keywords: 'theme dark light 主题 深色 浅色', run: () => s().toggleTheme() },
  { id: 'view.pin', label: '窗口置顶开关', group: '视图', keywords: 'pin top 置顶', run: () => s().togglePinned() },

  // 模式
  { id: 'mode.edit', label: '返回编辑器', group: '模式', keywords: 'back edit 返回 编辑', run: () => switchMode('edit') },
  { id: 'mode.diff', label: '对比 (Diff)', group: '模式', keywords: 'diff compare 对比', run: () => switchMode('diff') },
  { id: 'mode.convert', label: '格式转换 (YAML/XML/TOML/CSV)', group: '模式', keywords: 'convert yaml xml toml csv 转换', run: () => switchMode('convert') },
  { id: 'mode.code', label: '生成代码', group: '模式', keywords: 'code typescript go java rust 生成代码', run: () => switchMode('ts') },
  { id: 'mode.schema', label: 'JSON Schema', group: '模式', keywords: 'schema 校验', run: () => switchMode('schema') },
  { id: 'mode.tools', label: '工具箱', group: '模式', keywords: 'tools toolbox 工具箱', run: () => switchMode('tools') },

  // 工具箱直达
  { id: 'tool.base64', label: 'Base64 编解码', group: '工具箱', keywords: 'base64 b64', run: () => openTool('base64') },
  { id: 'tool.url', label: 'URL 编解码', group: '工具箱', keywords: 'url encode uri', run: () => openTool('url') },
  { id: 'tool.jwt', label: 'JWT 解析', group: '工具箱', keywords: 'jwt token decode', run: () => openTool('jwt') },
  { id: 'tool.hash', label: '哈希计算', group: '工具箱', keywords: 'hash sha md5 checksum', run: () => openTool('hash') },
  { id: 'tool.timestamp', label: '时间戳转换', group: '工具箱', keywords: 'timestamp date 时间', run: () => openTool('timestamp') },
  { id: 'tool.numbase', label: '进制转换', group: '工具箱', keywords: 'hex binary 进制', run: () => openTool('numbase') },

  // 其他
  { id: 'app.settings', label: '打开设置', group: '其他', keywords: 'settings 设置 偏好', run: () => s().setSettingsOpen(true) },
  { id: 'app.update', label: '检查更新', group: '其他', keywords: 'update 更新 版本', run: () => { void useUpdateStore.getState().check({ notify: true }) } },
]

/** 命令模糊匹配：命中 label / keywords / group 任一子串即保留，按匹配强度排序 */
export const searchCommands = (query: string, pool: AppCommand[] = COMMANDS): AppCommand[] => {
  const q = query.trim().toLowerCase()
  if (!q) return pool
  const scored: { cmd: AppCommand; score: number }[] = []
  for (const cmd of pool) {
    const label = cmd.label.toLowerCase()
    const hay = `${label} ${cmd.keywords ?? ''} ${cmd.group}`.toLowerCase()
    let score = -1
    if (label.startsWith(q)) score = 100
    else if (label.includes(q)) score = 80
    else if (hay.includes(q)) score = 50
    else {
      // 子序列匹配（如 "ms" → "美化 json" 命中 json 的 j-s-o-n? 这里做宽松子序列）
      let i = 0
      for (const ch of hay) { if (ch === q[i]) i++ }
      if (i === q.length) score = 20
    }
    if (score >= 0) scored.push({ cmd, score })
  }
  return scored.sort((a, b) => b.score - a.score).map(x => x.cmd)
}
