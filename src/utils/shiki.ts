import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
// JSON/简单语法用 JavaScript 正则引擎即可，避免 oniguruma wasm 在部分
// WebView/Tauri 环境下初始化挂起（会导致导出图片卡住不动）。
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import json from 'shiki/langs/json.mjs'
import yaml from 'shiki/langs/yaml.mjs'
import ts from 'shiki/langs/typescript.mjs'
import xml from 'shiki/langs/xml.mjs'
import toml from 'shiki/langs/toml.mjs'
import ini from 'shiki/langs/ini.mjs'
import python from 'shiki/langs/python.mjs'
import go from 'shiki/langs/go.mjs'
import java from 'shiki/langs/java.mjs'
import csharp from 'shiki/langs/csharp.mjs'
import rust from 'shiki/langs/rust.mjs'
import darkPlus from 'shiki/themes/dark-plus.mjs'
import lightPlus from 'shiki/themes/light-plus.mjs'

let highlighterPromise: Promise<HighlighterCore> | null = null

export function toShikiLang(lang: string): string {
  const map: Record<string, string> = {
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    ts: 'typescript',
    tsx: 'typescript',
    typescript: 'typescript',
    xml: 'xml',
    toml: 'toml',
    csv: 'text',
    text: 'text',
    python: 'python',
    py: 'python',
    go: 'go',
    golang: 'go',
    java: 'java',
    csharp: 'csharp',
    'c#': 'csharp',
    rust: 'rust',
    rs: 'rust',
  }
  return map[lang] || 'text'
}

export function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [darkPlus, lightPlus],
      langs: [json as any, yaml as any, ts as any, xml as any, toml as any, ini as any,
        python as any, go as any, java as any, csharp as any, rust as any],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    })
  }
  return highlighterPromise
}

/** 把代码高亮成 HTML 字符串（不含背景，透明，交给容器控制背景） */
export async function highlightToHtml(code: string, lang: string, theme: 'dark' | 'light'): Promise<string> {
  const highlighter = await getHighlighter()
  return highlighter.codeToHtml(code, {
    lang: toShikiLang(lang),
    theme: theme === 'dark' ? 'dark-plus' : 'light-plus',
    defaultColor: theme === 'dark' ? '#d4d7dd' : '#1f2937',
  })
}
