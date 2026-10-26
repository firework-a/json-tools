#!/usr/bin/env node
// 界面可访问性审计：无头 Chrome + CDP 逐屏扫描所有可见文本的 WCAG 对比度，并检查交互元素的可访问名。
//
//   pnpm build && pnpm preview --port 4173   # 需要先有静态站点在跑（或 pnpm dev）
//   pnpm a11y                                 # 默认审计 http://localhost:4173 的全部视图
//   pnpm a11y --url http://localhost:1420 --stops tools,settings
//
// 覆盖：编辑/树、格式转换、生成代码、Schema、对比、工具箱（逐个工具）、设置、命令面板 × 暗亮双主题。
// 退出码：0 全部达标；1 存在不达标项或审计失败。
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const APP = arg('url', 'http://localhost:4173/')
const CDP_PORT = Number(arg('cdp', 9334))
const ONLY = (arg('stops', '') || '').split(',').map(s => s.trim()).filter(Boolean)
const CHROME = arg('chrome', process.env.CHROME_PATH
  || 'C:/Program Files/Google/Chrome/Application/chrome.exe')

const sleep = ms => new Promise(r => setTimeout(r, ms))
const findChrome = () => process.platform !== 'win32'
  ? arg('chrome', process.env.CHROME_PATH || '/usr/bin/google-chrome')
  : CHROME

/** 审计用的样本数据：覆盖数组、时间戳、敏感键、null、长文本等渲染分支 */
const SAMPLE = JSON.stringify({
  project: 'json-tools',
  updated_at: 1730000000000,
  owner: { name: 'Ada', email: 'ada@example.com', password: 's3cret', token: 'abc.def.ghi' },
  items: [
    { id: 1, title: '键名风格批量转换', done: true, score: 0.9, secret: 'x', tags: ['tool', 'json'], meta: null },
    { id: 2, title: 'macOS 质感界面', done: false, score: 0.4, openid: 'o_1234567890', tags: ['ui'] },
    { id: 3, title: '字段路径统计', done: true, createdAt: '2026-01-02T03:04:05Z', tags: [] },
  ],
  long_text: '一段用于验证换行与截断的较长中文说明文本，包含中英文混排 mixed content 与符号 <>&/"\'。',
  nested: { deep: { deeper: { deepest: { value: 42, list: [1, 2, 3] } } } },
}, null, 2)

/** 审计站点：label 为工具栏按钮文案，check 用于确认确实进入了该视图（防止误报「通过」）
 *  工具模式会卸载主工具栏，故用持久化到 localStorage 的 mode 作为进入凭证。 */
const modeIs = mode => `(() => {
  const raw = localStorage.getItem('json-tools-settings');
  return !!raw && ((JSON.parse(raw).state || {}).mode) === ${JSON.stringify(mode)};
})()`
const STOPS = [
  { key: 'edit', label: null, check: `(() => { const raw = localStorage.getItem('json-tools-settings'); const m = raw ? (JSON.parse(raw).state || {}).mode : 'edit'; return !!document.querySelector('.monaco-editor') && m !== 'convert' && m !== 'ts' && m !== 'schema' && m !== 'diff' && m !== 'tools' })()` },
  { key: 'convert', label: '格式转换', check: modeIs('convert') },
  { key: 'ts', label: '生成代码', check: modeIs('ts') },
  { key: 'schema', label: 'Schema', check: modeIs('schema') },
  { key: 'diff', label: '对比', check: modeIs('diff') },
  { key: 'tools', label: '工具箱', check: modeIs('tools') },
  { key: 'settings', label: '设置', check: `!!document.querySelector('.settings-panel')` },
  { key: 'palette', label: null, check: `!!document.querySelector('.cmdk-panel')` },
]

const profile = mkdtempSync(join(tmpdir(), 'jt-a11y-'))
const chrome = spawn(findChrome(), [
  '--headless=new',
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1440,900',
  'about:blank',
], { stdio: 'ignore' })

const cleanup = () => {
  try { chrome.kill() } catch { /* 已退出 */ }
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* 临时目录清理失败不影响结论 */ }
}
process.on('exit', cleanup)

let version = null
for (let i = 0; i < 40; i++) {
  try {
    version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()
    break
  } catch {
    await sleep(500)
  }
}
if (!version) {
  console.error(`❌ 连不上 Chrome 调试端口（${CDP_PORT}）。用 --chrome <路径> 指定浏览器可执行文件。`)
  process.exit(1)
}

const pages = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const page = pages.find(p => p.type === 'page') ?? await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' })).json()

let msgId = 0
const pending = new Map()
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.onopen = resolve
  ws.onerror = () => reject(new Error('CDP WebSocket 连接失败'))
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { resolve: r, reject: j } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? j(new Error(m.error.message)) : r(m.result)
    }
  }
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++msgId
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async expression => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text)
  return r.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })

const PROBE = `(() => {
  const parse = c => {
    const m = c.match(/rgba?\\(([^)]+)\\)/)
    if (!m) return null
    const [r, g, b, a = 1] = m[1].split(',').map(Number)
    return { r, g, b, a: Number(a) }
  }
  const lum = ({ r, g, b }) => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 })
  const rootBg = () => {
    const c = parse(getComputedStyle(document.body).backgroundColor)
    return c && c.a > 0.05 ? { r: c.r, g: c.g, b: c.b, a: 1 } : { r: 255, g: 255, b: 255, a: 1 }
  }
  const effBg = el => {
    if (!el || el === document.documentElement) return rootBg()
    const c = parse(getComputedStyle(el).backgroundColor)
    if (!c || c.a === 0) return effBg(el.parentElement)
    if (c.a === 1) return { r: c.r, g: c.g, b: c.b, a: 1 }
    return blend(c, effBg(el.parentElement))
  }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }

  const seen = new Map()
  for (const el of document.querySelectorAll('body *')) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue
    const rect = el.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue
    const fg = parse(cs.color)
    if (!fg) continue
    const size = parseFloat(cs.fontSize)
    const bold = Number(cs.fontWeight) >= 700
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5
    const bg = effBg(el)
    const value = ratio(blend({ ...fg, a: fg.a }, bg), bg)
    if (value >= need) continue
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/)[0] : el.tagName.toLowerCase()
    const key = cls + '|' + cs.color
    if (!seen.has(key)) seen.set(key, { sel: cls, ratio: +value.toFixed(2), need, size: Math.round(size), fg: cs.color, bg: 'rgb(' + [bg.r, bg.g, bg.b].map(Math.round).join(', ') + ')', text: el.textContent.trim().slice(0, 20) })
  }

  const unlabeled = [...document.querySelectorAll('button, input, select, [role=switch], [role=tab]')]
    .filter(el => {
      if (el.tagName === 'INPUT') return !(el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.type === 'hidden' || el.type === 'checkbox')
      return !(el.textContent || '').trim() && !(el.getAttribute('aria-label') || el.getAttribute('title'))
    })
    .map(el => (typeof el.className === 'string' && el.className.trim()) || el.tagName.toLowerCase())

  return JSON.stringify({ failures: [...seen.values()].sort((a, b) => a.ratio - b.ratio), unlabeled: [...new Set(unlabeled)] })
})()`

/** 用 aria-label（优先）或可见文本/title 匹配点击工具栏按钮 */
const clickByLabel = label => `(() => {
  const want = ${JSON.stringify(label)};
  const nameOf = x => [(x.getAttribute('aria-label') || '').trim(), (x.textContent || '').trim(), (x.getAttribute('title') || '').trim()];
  const btns = [...document.querySelectorAll('.toolbar button')];
  const el = btns.find(x => nameOf(x).some(n => n === want))
    || btns.find(x => nameOf(x).some(n => n.includes(want)));
  if (!el) return 'miss';
  el.click(); return 'ok'
})()`

/** 工具箱二级标签：逐个点开以覆盖每个工具的选项区 */
const toolItems = `(() => [...document.querySelectorAll('.tools-item')].map((t, i) => ({ i, name: (t.textContent || '').trim() })))()`
const clickTool = i => `(() => { const t = document.querySelectorAll('.tools-item')[${i}]; if (!t) return 'miss'; t.click(); return (t.textContent || '').trim() })()`

const seed = theme => `(() => {
  const raw = localStorage.getItem('json-tools-settings');
  const st = raw ? (JSON.parse(raw).state || {}) : {};
  st.theme = ${JSON.stringify(theme)};
  st.mode = 'edit';
  st.tabs = [{ id: 'audit', name: 'audit.json', content: ${JSON.stringify(SAMPLE)}, language: 'json' }];
  st.activeTabId = 'audit';
  localStorage.setItem('json-tools-settings', JSON.stringify({ state: st, version: 1 }));
  return 1
})()`

const report = async (label, waitMs) => {
  await sleep(waitMs)
  const result = JSON.parse(await evaluate(PROBE))
  if (!result.failures.length && !result.unlabeled.length) {
    console.log(`  【${label}】对比度/命名：通过`)
    return 0
  }
  for (const f of result.failures) {
    console.log(`  【${label}】✗ ${String(f.ratio).padStart(5)} (需 ${f.need}, ${f.size}px) ${f.sel}  «${f.text}»  前景 ${f.fg} / 背景 ${f.bg}`)
  }
  if (result.unlabeled.length) console.log(`  【${label}】缺可访问名：`, result.unlabeled.join(' | '))
  return result.failures.length + result.unlabeled.length
}

const verify = async (stop, waitMs) => {
  await sleep(waitMs)
  if (!(await evaluate(stop.check))) {
    console.log(`  【${stop.key}】⚠️ 未进入该视图，审计中止`)
    return 1
  }
  return report(stop.key, 0)
}

/** 工具模式会卸载主工具栏，所以每个站点都从编辑态重新启动 */
const boot = async theme => {
  await evaluate(seed(theme))
  await send('Page.navigate', { url: APP })
  await sleep(3000)
}

/** 用 CDP 真实按键验证焦点行为（合成 KeyboardEvent 不会移动焦点，必须走 Input.dispatchKeyEvent） */
const CTRL = 2
const press = async (key, code, vk, modifiers = 0) => {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers }
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
}
const focusInside = sel => `(() => { const a = document.activeElement, p = document.querySelector(${JSON.stringify(sel)}); return !!(a && p && p.contains(a)) })()`
const activeDesc = `(() => { const a = document.activeElement; if (!a) return 'null'; const c = typeof a.className === 'string' ? a.className.trim().split(/\\s+/)[0] : ''; return a.tagName.toLowerCase() + '.' + c })()`

const keyboardAudit = async theme => {
  let issues = 0
  const check = (name, pass, extra = '') => {
    console.log(`  【键盘】${name}：${pass ? '通过' : '✗ 失败 ' + extra}`)
    if (!pass) issues++
  }
  await boot(theme)

  // 命令面板：焦点进入输入框 → 方向键移动高亮 → Tab 不逃出面板 → Esc 关闭并归还焦点
  const before = await evaluate(activeDesc)
  await evaluate(clickByLabel('命令面板'))
  await sleep(500)
  check('面板焦点在输入框', await evaluate(focusInside('.cmdk-input')))
  await press('ArrowDown', 'ArrowDown', 40)
  await press('ArrowDown', 'ArrowDown', 40)
  const idx = await evaluate(`document.querySelector('.cmdk-item.active')?.dataset.idx ?? -1`)
  check('方向键移动高亮', Number(idx) === 2, `高亮索引 ${idx}`)
  let trapped = true
  for (let i = 0; i < 10; i++) {
    await press('Tab', 'Tab', 9)
    if (!(await evaluate(focusInside('.cmdk-panel')))) { trapped = false; break }
  }
  check('Tab 焦点困在面板内', trapped, trapped ? '' : await evaluate(activeDesc))
  await press('Escape', 'Escape', 27)
  await sleep(300)
  const closed = !(await evaluate(`!!document.querySelector('.cmdk-panel')`))
  check('Esc 关闭面板', closed)
  check('关闭后焦点归还触发按钮', closed && (await evaluate(activeDesc)) === before, `${before} → ${await evaluate(activeDesc)}`)

  // 设置面板：焦点进入 → Tab 不逃出 → Esc 关闭
  await evaluate(clickByLabel('设置'))
  await sleep(500)
  check('设置面板焦点困在面板内', await evaluate(focusInside('.settings-panel')), await evaluate(activeDesc))
  let setTrapped = true
  for (let i = 0; i < 12; i++) {
    await press('Tab', 'Tab', 9)
    if (!(await evaluate(focusInside('.settings-panel')))) { setTrapped = false; break }
  }
  check('设置面板 Tab 循环', setTrapped, setTrapped ? '' : await evaluate(activeDesc))
  await press('Escape', 'Escape', 27)
  await sleep(300)
  check('Esc 关闭设置', !(await evaluate(`!!document.querySelector('.settings-panel')`)))
  return issues
}

let total = 0
for (const theme of ['dark', 'light']) {
  console.log(`\n########## ${theme} 主题 ##########`)
  await send('Page.navigate', { url: APP })
  await sleep(2500)

  for (const stop of STOPS) {
    if (ONLY.length && !ONLY.includes(stop.key)) continue
    await boot(theme)

    if (stop.key === 'palette') {
      await evaluate(`(() => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true })); return 1 })()`)
      total += await verify(stop, 700)
      continue
    }
    if (stop.key === 'edit') {
      total += await verify(stop, 300)
      continue
    }
    if (stop.key === 'tools') {
      const clicked = await evaluate(clickByLabel(stop.label))
      if (clicked !== 'ok') {
        console.log(`  【tools】⚠️ 找不到入口按钮「工具箱」，审计中止`)
        total += 1
        continue
      }
      await sleep(800)
      const items = await evaluate(toolItems)
      if (!items.length) {
        console.log('  【tools】⚠️ 工具箱列表为空，审计中止')
        total += 1
        continue
      }
      for (const item of items) {
        const name = await evaluate(clickTool(item.i))
        total += await report(`tools/${name}`, 400)
      }
      // 下拉菜单：CustomSelect 展开态（.csel-item.focused 用强调色实心 + 白字）
      const withSelect = items.find(x => /键名风格|表格导出|时间戳/.test(x.name)) || items[0]
      await evaluate(clickTool(withSelect.i))
      await sleep(300)
      await evaluate(`(() => { const t = document.querySelector('.csel-trigger'); if (t) t.click(); return !!t })()`)
      total += await report('tools/select-open', 400)
      continue
    }
    const clicked = await evaluate(clickByLabel(stop.label))
    if (clicked === 'miss') {
      console.log(`  【${stop.key}】⚠️ 找不到入口按钮「${stop.label}」，审计中止`)
      total += 1
      continue
    }
    total += await verify(stop, stop.key === 'settings' ? 800 : 900)
  }
  if (!ONLY.length || ONLY.includes('kbd')) total += await keyboardAudit(theme)
}

ws.close()
cleanup()
console.log(total ? `\n❌ 共 ${total} 项待修` : '\n✅ 全部通过')
process.exit(total ? 1 : 0)
