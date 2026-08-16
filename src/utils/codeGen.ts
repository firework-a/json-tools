// 多语言代码生成：基于 quicktype-core，根据 JSON 样本推断类型并生成
// TypeScript / Python / Go / Java / C# 等强类型代码。
import {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
  type JSONSchemaTargetLanguage,
} from 'quicktype-core'

export type CodeLang = 'typescript' | 'python' | 'go' | 'java' | 'csharp' | 'rust'

export interface CodeLangMeta {
  id: CodeLang
  label: string
  /** Shiki 语法名 */
  shiki: string
  /** 类型/类/结构体的"根名"输入框的占位符 */
  rootLabel: string
}

export const CODE_LANGS: CodeLangMeta[] = [
  { id: 'typescript', label: 'TypeScript', shiki: 'typescript', rootLabel: '接口名' },
  { id: 'python', label: 'Python', shiki: 'python', rootLabel: '类名' },
  { id: 'go', label: 'Go', shiki: 'go', rootLabel: '结构体名' },
  { id: 'java', label: 'Java', shiki: 'java', rootLabel: '类名' },
  { id: 'csharp', label: 'C#', shiki: 'csharp', rootLabel: '类名' },
  { id: 'rust', label: 'Rust', shiki: 'rust', rootLabel: '结构体名' },
]

const RENDERER_OPTIONS: Partial<Record<CodeLang, Record<string, string>>> = {
  typescript: {
    'just-types': 'true',
    'prefer-unions': 'true',
    'prefer-const-values': 'false',
  },
  python: {
    'python-version': '3.10',
    'python-output': 'dataclasses',
    'no-requirements': 'true',
  },
  go: { 'package': 'main' },
  java: { 'package': 'io.generated', 'array-type': 'list' },
  csharp: {
    'namespace': 'Generated',
    'features': 'attributes-only',
    'framework': 'SystemTextJson',
    'csharp-version': '8',
  },
  rust: { 'density': 'normal', 'visibility': 'public' },
}

const sanitizeName = (s: string, fallback: string) => {
  // quicktype 对根名要求是合法标识符；去掉不支持的字符
  const cleaned = s.replace(/[^\w$]/g, '_').replace(/^[^A-Za-z_$]/, '_')
  return cleaned || fallback
}

export const generateCode = async (
  input: string,
  lang: CodeLang,
  rootName: string,
): Promise<{ result: string; error: string | null }> => {
  const trimmed = input.trim()
  if (!trimmed) return { result: '', error: null }
  try {
    const name = sanitizeName(rootName, 'Root')
    const jsonInput = jsonInputForTargetLanguage(lang as unknown as JSONSchemaTargetLanguage)
    await jsonInput.addSource({ name, samples: [trimmed] })
    const inputData = new InputData()
    inputData.addInput(jsonInput)
    const { lines } = await quicktype({
      inputData,
      lang: lang as unknown as JSONSchemaTargetLanguage,
      indentation: '  ',
      inferMaps: true,
      inferEnums: true,
      alphabetizeProperties: false,
      rendererOptions: RENDERER_OPTIONS[lang] ?? {},
    })
    return { result: lines.join('\n'), error: null }
  } catch (err) {
    return {
      result: '',
      error: err instanceof Error ? err.message : '代码生成失败',
    }
  }
}
