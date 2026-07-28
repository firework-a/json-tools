// 根据 JSON 推断 TypeScript interface
const toPascalCase = (s: string) => s.replace(/(^|[-_\s])(\w)/g, (_, __, c) => c.toUpperCase())

const inferType = (value: any): string => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

interface GenOptions {
  rootName?: string
  exportKeyword?: boolean
}

export const jsonToTs = (input: string, opts: GenOptions = {}): { result: string; error: string | null } => {
  try {
    const data = JSON.parse(input)
    const { rootName = 'Root', exportKeyword = true } = opts
    const lines: string[] = []
    const named = new Set<string>()

    const genName = (base: string): string => {
      let name = toPascalCase(base) || 'Root'
      let i = 2
      while (named.has(name)) name = toPascalCase(base) + i++
      named.add(name)
      return name
    }

    const emitInterface = (name: string, obj: Record<string, any>) => {
      const entries = Object.entries(obj)
      // 递归先生成子类型
      const fieldTypes: Array<[string, string]> = entries.map(([k, v]) => [k, valueToTs(v, k)])
      const prefix = exportKeyword ? 'export ' : ''
      lines.push(`${prefix}interface ${name} {`)
      for (const [k, t] of fieldTypes) {
        const optKey = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)
        lines.push(`  ${optKey}: ${t};`)
      }
      lines.push('}')
      lines.push('')
    }

    const valueToTs = (value: any, nameHint: string): string => {
      const t = inferType(value)
      switch (t) {
        case 'string':
          return 'string'
        case 'number':
          return Number.isInteger(value) ? 'number' : 'number'
        case 'boolean':
          return 'boolean'
        case 'null':
          return 'null'
        case 'array': {
          if (value.length === 0) return 'any[]'
          // 若全部是 primitive 且类型一致，直接简写
          const types = new Set(value.map(inferType))
          const firstT = [...types][0]
          if (types.size === 1 && (firstT === 'string' || firstT === 'number' || firstT === 'boolean')) {
            return `${[...types][0]}[]`
          }
          // 否则取第一个元素的类型（合并对象）
          const first = value[0]
          if (inferType(first) === 'object') {
            const merged: Record<string, any> = {}
            for (const item of value) {
              if (item && typeof item === 'object' && !Array.isArray(item)) {
                for (const k of Object.keys(item)) merged[k] = item[k]
              }
            }
            const name = genName(nameHint + 'Item')
            emitInterface(name, merged)
            return `${name}[]`
          }
          return `${valueToTs(first, nameHint + 'Item')}[]`
        }
        case 'object': {
          const keys = Object.keys(value)
          if (keys.length === 0) return 'Record<string, any>'
          const name = genName(nameHint)
          emitInterface(name, value)
          return name
        }
        default:
          return 'any'
      }
    }

    if (inferType(data) === 'object') {
      const rootInterface = genName(rootName)
      emitInterface(rootInterface, data)
    } else {
      const typeStr = valueToTs(data, rootName)
      const prefix = exportKeyword ? 'export ' : ''
      lines.push(`${prefix}type ${genName(rootName)} = ${typeStr};`)
      lines.push('')
    }

    return { result: lines.join('\n').trim(), error: null }
  } catch (err) {
    return { result: '', error: err instanceof Error ? err.message : '生成失败' }
  }
}
