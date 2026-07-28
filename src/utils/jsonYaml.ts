import { dump, load } from 'js-yaml'

export const jsonToYaml = (input: string): { result: string; error: string | null } => {
  try {
    const data = JSON.parse(input)
    return { result: dump(data, { indent: 2, lineWidth: 120 }), error: null }
  } catch (err) {
    return { result: '', error: err instanceof Error ? err.message : '转换失败' }
  }
}

export const yamlToJson = (input: string): { result: string; error: string | null } => {
  try {
    const data = load(input)
    return { result: JSON.stringify(data, null, 2), error: null }
  } catch (err) {
    return { result: '', error: err instanceof Error ? err.message : '转换失败' }
  }
}
