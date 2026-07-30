import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'

export type FormatResult = { result: string; error: string | null }

const fail = (error: unknown): FormatResult => ({
  result: '',
  error: error instanceof Error ? error.message : '转换失败',
})

export const jsonToXml = (input: string): FormatResult => {
  try {
    const data = JSON.parse(input)
    const builder = new XMLBuilder({
      format: true,
      indentBy: '  ',
      ignoreAttributes: false,
      suppressEmptyNode: true,
    })
    return { result: builder.build({ root: data }), error: null }
  } catch (error) {
    return fail(error)
  }
}

export const xmlToJson = (input: string): FormatResult => {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: true,
      trimValues: true,
    })
    const parsed = parser.parse(input)
    return { result: JSON.stringify(parsed.root ?? parsed, null, 2), error: null }
  } catch (error) {
    return fail(error)
  }
}

export const jsonToToml = (input: string): FormatResult => {
  try {
    const data = JSON.parse(input)
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { result: '', error: 'TOML 根节点必须是 JSON 对象' }
    }
    return { result: stringifyToml(data), error: null }
  } catch (error) {
    return fail(error)
  }
}

export const tomlToJson = (input: string): FormatResult => {
  try {
    return { result: JSON.stringify(parseToml(input), null, 2), error: null }
  } catch (error) {
    return fail(error)
  }
}

const csvCell = (value: unknown): string => {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const jsonToCsv = (input: string): FormatResult => {
  try {
    const data = JSON.parse(input)
    const rows = Array.isArray(data) ? data : [data]
    if (!rows.length || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
      return { result: '', error: 'CSV 转换要求 JSON 是对象或对象数组' }
    }
    const headers = [...new Set(rows.flatMap(row => Object.keys(row)))]
    const result = [
      headers.map(csvCell).join(','),
      ...rows.map(row => headers.map(header => csvCell(row[header])).join(',')),
    ].join('\n')
    return { result, error: null }
  } catch (error) {
    return fail(error)
  }
}

const parseCsv = (input: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"' && cell === '') {
      quoted = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter(item => item.some(value => value !== ''))
}

const csvValue = (value: string): unknown => {
  if (value === '') return null
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value)
  return value
}

export const csvToJson = (input: string): FormatResult => {
  try {
    const rows = parseCsv(input)
    if (rows.length < 1 || !rows[0].length) return { result: '', error: 'CSV 内容为空' }
    const headers = rows[0]
    if (new Set(headers).size !== headers.length || headers.some(header => !header)) {
      return { result: '', error: 'CSV 表头不能为空且不能重复' }
    }
    const data = rows.slice(1).map(row => Object.fromEntries(headers.map((header, index) => [header, csvValue(row[index] ?? '')])))
    return { result: JSON.stringify(data, null, 2), error: null }
  } catch (error) {
    return fail(error)
  }
}
