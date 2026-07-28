import { diffLines, Change } from 'diff'

export interface DiffResult {
  type: 'equal' | 'insert' | 'delete'
  count: number
}

/**
 * JSON 差异比较 - 行级文本对比
 * diffLines 返回的 change.value 对于非末尾块会以 \n 结尾，
 * 所以统一按"实际行数 = value 里换行数"来计数。
 */
export class JsonDiffer {
  static compare(leftJson: string, rightJson: string): {
    differences: DiffResult[]
    leftDiffLines: Set<number>
    rightDiffLines: Set<number>
    stats: { added: number; deleted: number }
  } {
    try {
      const leftText = leftJson.trim() ? JSON.stringify(JSON.parse(leftJson), null, 2) : ''
      const rightText = rightJson.trim() ? JSON.stringify(JSON.parse(rightJson), null, 2) : ''

      if (!leftText && !rightText) {
        return { differences: [], leftDiffLines: new Set(), rightDiffLines: new Set(), stats: { added: 0, deleted: 0 } }
      }

      const changes = diffLines(leftText, rightText)
      const leftDiffLines = new Set<number>()
      const rightDiffLines = new Set<number>()
      const differences: DiffResult[] = []

      let leftLine = 1
      let rightLine = 1
      let added = 0
      let deleted = 0

      // 统计一段文本占多少行（= 换行数，若文本非空且不以换行结尾则 +1）
      const countLines = (text: string): number => {
        let n = 0
        for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++
        // diff-lines 约定：除最后一段外每段以 \n 结尾，行数等于换行数；最后一段如果有内容但不以 \n 结尾，行数 +1
        if (text.length > 0 && !text.endsWith('\n')) n++
        return n
      }

      changes.forEach((change: Change) => {
        const n = countLines(change.value)
        if (change.added) {
          for (let i = 0; i < n; i++) rightDiffLines.add(rightLine++)
          added += n
          differences.push({ type: 'insert', count: n })
        } else if (change.removed) {
          for (let i = 0; i < n; i++) leftDiffLines.add(leftLine++)
          deleted += n
          differences.push({ type: 'delete', count: n })
        } else {
          leftLine += n
          rightLine += n
        }
      })

      return { differences, leftDiffLines, rightDiffLines, stats: { added, deleted } }
    } catch {
      return { differences: [], leftDiffLines: new Set(), rightDiffLines: new Set(), stats: { added: 0, deleted: 0 } }
    }
  }

  static generateSummary(stats: { added: number; deleted: number }): string {
    const { added, deleted } = stats
    if (added === 0 && deleted === 0) return '两个 JSON 完全相同'
    const parts: string[] = []
    if (added > 0) parts.push(`${added} 行新增`)
    if (deleted > 0) parts.push(`${deleted} 行删除`)
    return `发现差异：${parts.join('，')}`
  }
}
