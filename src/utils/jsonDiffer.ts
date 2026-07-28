import { diffLines, Change } from 'diff'

export interface DiffMap {
  left: Set<number>
  right: Set<number>
  leftRemoved: Set<number>
  rightAdded: Set<number>
}

/**
 * 返回两个 JSON 的行级 diff 映射：
 * - leftRemoved：左侧删除行（整行标红）
 * - rightAdded：右侧新增行（整行标绿）
 * - left/right：所有有变更的行号
 */
export function computeDiff(leftJson: string, rightJson: string): DiffMap {
  const left = new Set<number>()
  const right = new Set<number>()
  const leftRemoved = new Set<number>()
  const rightAdded = new Set<number>()

  try {
    const lText = leftJson.trim() ? JSON.stringify(JSON.parse(leftJson), null, 2) : ''
    const rText = rightJson.trim() ? JSON.stringify(JSON.parse(rightJson), null, 2) : ''

    const countLines = (text: string): number => {
      if (!text) return 0
      let n = 0
      for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++
      if (!text.endsWith('\n') && text.length > 0) n++
      return n
    }

    const changes: Change[] = diffLines(lText, rText)
    let lLine = 1, rLine = 1
    changes.forEach((c) => {
      const n = countLines(c.value)
      if (c.added) {
        for (let i = 0; i < n; i++) { right.add(rLine); rightAdded.add(rLine); rLine++ }
      } else if (c.removed) {
        for (let i = 0; i < n; i++) { left.add(lLine); leftRemoved.add(lLine); lLine++ }
      } else {
        lLine += n; rLine += n
      }
    })
  } catch { /* ignore */ }

  return { left, right, leftRemoved, rightAdded }
}
