// 从 JSON 推断 JSON Schema (draft-07)
// 注意：数组里可能出现不同形状的元素，必须合并所有元素的 schema，
// 不能只取第一项，否则小数被推断成 integer、异构对象字段被误标 required。

type Json = null | boolean | number | string | Json[] | { [k: string]: Json }

const typeOf = (v: Json): string => {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  const t = typeof v
  if (t === 'number') return Number.isInteger(v) ? 'integer' : 'number'
  return t
}

/** 合并两个类型字符串：integer + number → number；其余不同 → 联合数组 */
const mergeTypes = (a: string | string[], b: string): string | string[] => {
  const set = new Set<string>()
  const add = (t: string | string[]) => (Array.isArray(t) ? t : [t]).forEach(x => set.add(x))
  add(a)
  // integer 是 number 的子集，有 number 就不要 integer
  if (set.has('number')) set.delete('integer')
  add(b)
  if (set.has('number')) set.delete('integer')
  const arr = [...set]
  if (arr.length === 1) return arr[0]
  // 稳定排序：null 最后
  return arr.sort((x, y) => {
    if (x === 'null') return 1
    if (y === 'null') return -1
    return x.localeCompare(y)
  })
}

const isEmptySchema = (s: any): boolean =>
  s && typeof s === 'object' && Object.keys(s).length === 0

/** 深度合并两个 schema */
const mergeSchema = (a: any, b: any): any => {
  if (a === undefined || isEmptySchema(a)) return b
  if (b === undefined || isEmptySchema(b)) return a
  if (a === true || b === true) return true
  if (a === false) return b
  if (b === false) return a

  const out: any = {}

  // 类型
  if (a.type !== undefined || b.type !== undefined) {
    if (a.type === undefined) out.type = b.type
    else if (b.type === undefined) out.type = a.type
    else out.type = mergeTypes(a.type, Array.isArray(b.type) ? b.type[0] : b.type)
  }

  // 对象属性
  if (a.properties || b.properties) {
    const keys = new Set([...Object.keys(a.properties ?? {}), ...Object.keys(b.properties ?? {})])
    const props: Record<string, any> = {}
    const reqA = new Set(a.required ?? [])
    const reqB = new Set(b.required ?? [])
    const required: string[] = []
    keys.forEach(k => {
      const pa = a.properties?.[k]
      const pb = b.properties?.[k]
      if (pa && pb) {
        props[k] = mergeSchema(pa, pb)
      } else {
        // 只在一边出现的属性，用另一边的 schema；可能为 null（缺省）
        props[k] = pa ?? pb
      }
      // 只有两边都 required 才算 required
      const inA = a.properties && k in a.properties
      const inB = b.properties && k in b.properties
      if ((inA ? reqA.has(k) : false) && (inB ? reqB.has(k) : false)) {
        required.push(k)
      }
    })
    out.properties = props
    if (required.length) out.required = required
  }

  // 数组 items：合并
  if (a.items || b.items) {
    if (a.items && b.items) out.items = mergeSchema(a.items, b.items)
    else out.items = a.items ?? b.items
  }

  return out
}

/** 从单个值推断 schema；数组会遍历全部元素合并 */
const infer = (value: Json): any => {
  const type = typeOf(value)
  const schema: any = { type }

  if (type === 'object') {
    const props: Record<string, any> = {}
    const required: string[] = []
    for (const [k, v] of Object.entries(value as Record<string, Json>)) {
      props[k] = infer(v)
      required.push(k)
    }
    schema.properties = props
    if (required.length) schema.required = required
  } else if (type === 'array') {
    const arr = value as Json[]
    if (arr.length === 0) {
      schema.items = {}
    } else {
      // 合并所有元素的 schema，处理异构数组、元组
      let merged = infer(arr[0])
      for (let i = 1; i < arr.length; i++) {
        merged = mergeSchema(merged, infer(arr[i]))
      }
      schema.items = merged
    }
  }
  return schema
}

export const jsonToSchema = (input: string): { result: string; error: string | null } => {
  try {
    const data: Json = JSON.parse(input)
    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      ...infer(data),
    }
    return { result: JSON.stringify(schema, null, 2), error: null }
  } catch (err) {
    return { result: '', error: err instanceof Error ? err.message : '生成失败' }
  }
}
