import type { RetrievalMode } from '../types'
import { EVAL_ROWS, type DemoEvalRow } from './data'

export interface ModeMetrics {
  hit1: number
  hit5: number
  mrr: number
  n: number
}

export const EVAL_MODES: RetrievalMode[] = ['semantic', 'keyword', 'hybrid']

export function metrics(rows: DemoEvalRow[], mode: RetrievalMode): ModeMetrics {
  let hit1 = 0
  let hit5 = 0
  let rr = 0
  for (const r of rows) {
    const rank = r.ranks[mode]
    if (rank !== null) {
      if (rank === 1) hit1 += 1
      if (rank <= 5) hit5 += 1
      rr += 1 / rank
    }
  }
  const n = Math.max(1, rows.length)
  return { hit1: hit1 / n, hit5: hit5 / n, mrr: rr / n, n: rows.length }
}

export { EVAL_ROWS }
