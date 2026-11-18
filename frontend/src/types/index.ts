// Mirrors backend/app/schemas.py one-to-one.

export type RetrievalMode = 'hybrid' | 'semantic' | 'keyword'
export type AnswerMode = 'generated' | 'retrieval_only' | 'no_answer'
export type DocumentStatus = 'processing' | 'ready' | 'failed'
export type KbStatus = 'empty' | 'processing' | 'ready' | 'degraded'

export interface ErrorDetail {
  code: string
  message: string
  document_id?: string | null
}

export interface ErrorResponse {
  error: ErrorDetail
}

export interface DocumentOut {
  id: string
  filename: string
  file_size: number
  page_count: number | null
  status: DocumentStatus
  error_message: string | null
  chunk_count: number
  uploaded_at: string
  /** Demo mode only: explains why a simulated upload is not searchable. */
  demo_note?: string | null
}

export interface LLMHealth {
  reachable: boolean
  model: string | null
  model_available: boolean
}

export interface HealthResponse {
  status: 'ok'
  demo_mode: boolean
  index_vectors: number
  llm: LLMHealth
}

export interface ChatRequest {
  question: string
  conversation_id: string | null
  retrieval_mode: RetrievalMode
}

export interface SourceOut {
  ref: number
  chunk_id: number
  document_id: string
  document_name: string
  page: number
  content: string
  semantic_score: number | null
  bm25_score: number | null
  rrf_score: number
  cited: boolean
}

export interface ChatResponse {
  conversation_id: string
  answer: string
  answer_mode: AnswerMode
  retrieval_mode: RetrievalMode
  model: string | null
  latency_ms: number
  sources: SourceOut[]
  /** Demo mode only: step-by-step record of how the answer was retrieved. */
  trace?: RetrievalTrace
}

export interface LLMErrorResponse {
  error: ErrorDetail
  retrieval_mode: RetrievalMode
  sources: SourceOut[]
}

export interface ConversationOut {
  id: string
  title: string
  created_at: string
}

export interface MessageOut {
  id: number
  role: 'user' | 'assistant'
  content: string
  answer_mode: AnswerMode | null
  sources: SourceOut[] | null
  created_at: string
  retrieval_mode?: RetrievalMode
  trace?: RetrievalTrace
}

export interface RecentQuestionOut {
  question: string
  asked_at: string
  answer_mode: AnswerMode | null
}

export interface AnalyticsResponse {
  total_documents: number
  ready_documents: number
  total_chunks: number
  total_questions: number
  index_vectors: number
  recent_documents: DocumentOut[]
  recent_questions: RecentQuestionOut[]
  kb_status: KbStatus
}

export interface DemoQuestionsResponse {
  questions: string[]
}

// ---------------------------------------------------------------- demo-only types

export interface TraceHit {
  chunk_id: number
  document_name: string
  page: number
  score: number
}

export interface FusedRow {
  chunk_id: number
  document_name: string
  page: number
  semantic_rank: number | null
  keyword_rank: number | null
  rrf_score: number
  selected: boolean
  skipped_reason: string | null
}

export interface RetrievalTrace {
  question: string
  mode: RetrievalMode
  /** True when the question has no recorded semantic results (custom questions in the demo). */
  custom: boolean
  query_tokens: string[]
  semantic: TraceHit[] | null
  keyword: TraceHit[] | null
  fused: FusedRow[]
  gate: { threshold: number; best_semantic: number | null; keyword_hit: boolean; passed: boolean }
  prompt: { sources: number; chars: number } | null
  timings_ms: { embed: number; semantic: number; keyword: number; fuse: number; generate: number }
}

export type IngestionStage = 'upload' | 'parse' | 'chunk' | 'embed' | 'index' | 'ready'

export interface IngestionProgress {
  document_id: string
  filename: string
  stage: IngestionStage
  pages: number | null
  chunks: number | null
  searchable: boolean
}
