// 常用编解码：Base64 / URL / JWT / 哈希 / 时间戳 / 进制
export interface EncodeResult { result: string; error: string | null }
const ok = (result: string): EncodeResult => ({ result, error: null })
const err = (error: string): EncodeResult => ({ result: '', error })

const bytesToBinary = (bytes: Uint8Array): string => {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return bin
}

export const base64Encode = (text: string): EncodeResult => {
  try { return ok(btoa(bytesToBinary(new TextEncoder().encode(text)))) }
  catch (e) { return err(e instanceof Error ? e.message : '编码失败') }
}

export const base64Decode = (b64: string): EncodeResult => {
  try {
    const clean = b64.trim()
    const bin = atob(clean)
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
    return ok(new TextDecoder().decode(bytes))
  } catch {
    return err('不是合法的 Base64 字符串')
  }
}

export const urlEncode = (text: string): EncodeResult => {
  try { return ok(encodeURIComponent(text)) } catch (e) { return err(String(e)) }
}
export const urlDecode = (text: string): EncodeResult => {
  try { return ok(decodeURIComponent(text)) } catch { return err('URL 解码失败：存在非法转义序列') }
}

const b64urlDecode = (seg: string): string => {
  const pad = seg.length % 4 === 0 ? '' : '='.repeat(4 - (seg.length % 4))
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** 解析 JWT：输出 header / payload / signature 三段 */
export const decodeJwt = (token: string): EncodeResult => {
  const parts = token.trim().split('.')
  if (parts.length !== 3) return err('JWT 应为 header.payload.signature 三段结构')
  try {
    const header = JSON.parse(b64urlDecode(parts[0]))
    const payload = JSON.parse(b64urlDecode(parts[1]))
    const fmt = (o: unknown) => JSON.stringify(o, null, 2)
    const exp = typeof payload.exp === 'number'
      ? `\n\n过期时间: ${new Date(payload.exp * 1000).toLocaleString()}${Date.now() / 1000 > payload.exp ? '（已过期）' : ''}`
      : ''
    return ok(`── Header ──\n${fmt(header)}\n\n── Payload ──\n${fmt(payload)}${exp}\n\n── Signature ──\n${parts[2]}`)
  } catch {
    return err('JWT 段解码失败（Base64URL 非法）')
  }
}

export const HASH_ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const
export type HashAlgo = (typeof HASH_ALGOS)[number]

export const hashText = async (text: string, algo: HashAlgo): Promise<EncodeResult> => {
  try {
    if (!crypto?.subtle) return err('当前环境不支持 WebCrypto')
    const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text))
    const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
    return ok(hex)
  } catch (e) {
    return err(e instanceof Error ? e.message : '哈希失败')
  }
}

/** 时间戳 ↔ 日期：纯数字视为时间戳（10 位秒 / 13 位毫秒），否则尝试按日期解析 */
export const convertTimestamp = (raw: string): EncodeResult => {
  const t = raw.trim()
  if (!t) return err('请输入时间戳或日期字符串')
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const local = (d: Date) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  if (/^\d{10}$/.test(t)) {
    const d = new Date(Number(t) * 1000)
    return ok(`本地: ${local(d)}\nUTC:   ${d.toISOString()}\n毫秒:  ${d.getTime()}`)
  }
  if (/^\d{13}$/.test(t)) {
    const d = new Date(Number(t))
    return ok(`本地: ${local(d)}\nUTC:   ${d.toISOString()}\n秒:    ${Math.floor(d.getTime() / 1000)}`)
  }
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return err('无法识别的时间格式')
  return ok(`本地: ${local(d)}\nUTC:   ${d.toISOString()}\n秒:    ${Math.floor(d.getTime() / 1000)}\n毫秒:  ${d.getTime()}`)
}

/** 进制转换：value 按 fromBase 解析，输出 2/8/10/16 全进制 */
export const convertNumberBase = (value: string, fromBase: number): EncodeResult => {
  const v = value.trim().toLowerCase().replace(/^0[xob]?/, '')
  if (!v) return err('请输入数值')
  const num = parseInt(v, fromBase)
  if (Number.isNaN(num)) return err(`不是合法的 ${fromBase} 进制数`)
  return ok(`十进制: ${num.toString(10)}\n二进制: ${num.toString(2)}\n八进制: ${num.toString(8)}\n十六进制: ${num.toString(16).toUpperCase()}`)
}
