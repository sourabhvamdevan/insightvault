import type { RetrievalMode } from '../types'

export const MODE_LABEL: Record<RetrievalMode, string> = {
  hybrid: 'Hybrid',
  semantic: 'Semantic',
  keyword: 'Keyword',
}

export const MODE_DESCRIPTION: Record<RetrievalMode, string> = {
  hybrid: 'Both searches, fused with reciprocal rank fusion',
  semantic: 'Meaning, from sentence embeddings',
  keyword: 'Exact words and policy IDs, with BM25',
}

/** Validated categorical colors (see index.css --color-mode-*). */
export const MODE_COLOR: Record<RetrievalMode, string> = {
  hybrid: '#0f8a7e',
  semantic: '#1f7fbf',
  keyword: '#c25e0a',
}
