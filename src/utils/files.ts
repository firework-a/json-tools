import { isTauri, invoke } from '@tauri-apps/api/core'
import type { EditorLanguage } from '../store'

export interface LoadedFile {
  /** 原生文件绝对路径（仅 Tauri 环境有值，浏览器下载/上传为空） */
  path?: string
  name: string
  content: string
  language: EditorLanguage
}

export const languageForName = (name: string): EditorLanguage =>
  /\.json$/i.test(name) ? 'json' : 'plaintext'

export const basename = (path: string): string => {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

/** 打开一个文本文件。Tauri 走原生对话框+文件系统；浏览器降级为隐藏 input。 */
export const openTextFile = (): Promise<LoadedFile | null> => {
  if (isTauri()) {
    return openTextFileTauri()
  }
  return openTextFileBrowser()
}

const openTextFileTauri = async (): Promise<LoadedFile | null> => {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const { readTextFile } = await import('@tauri-apps/plugin-fs')
  const selected = await open({
    multiple: false,
    filters: [{ name: '支持的文件', extensions: ['json', 'txt', 'yaml', 'yml'] }],
  })
  if (!selected || typeof selected !== 'string') return null
  const content = await readTextFile(selected)
  const name = basename(selected)
  return { path: selected, name, content, language: languageForName(name) }
}

const openTextFileBrowser = (): Promise<LoadedFile | null> =>
  new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.txt,.yaml,.yml'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return resolve(null)
      const content = await f.text()
      resolve({ name: f.name, content, language: languageForName(f.name) })
    }
    input.click()
  })

/** 读取拖拽到窗口上的文件。路径不在 fs 插件 scope 内，走后端受控命令。 */
export const readTextFileAt = async (path: string): Promise<LoadedFile> => {
  const content = await invoke<string>('read_dropped_file', { path })
  const name = basename(path)
  return { path, name, content, language: languageForName(name) }
}

/** 写入已存在的路径（保存）。 */
export const writeTextFile = async (path: string, content: string): Promise<void> => {
  const { writeTextFile: nativeWrite } = await import('@tauri-apps/plugin-fs')
  await nativeWrite(path, content)
}

/** 弹出保存对话框并写入，返回选中的路径（浏览器走下载，返回 null）。 */
export const saveTextFileAs = async (
  content: string,
  defaultName: string,
): Promise<string | null> => {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile: nativeWrite } = await import('@tauri-apps/plugin-fs')
    const path = await save({
      defaultPath: defaultName,
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: '文本文件', extensions: ['txt'] },
      ],
    })
    if (!path) return null
    await nativeWrite(path, content)
    return path
  }

  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return null
}
