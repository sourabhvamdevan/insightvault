// In-browser stand-in for the backend, used when the app runs in demo mode.
// Retrieval for curated questions replays real backend measurements (see data.ts) through the same
// RRF fusion, dedupe and relevance gate as the backend; other questions use an in-browser BM25 port.

import { ApiError } from '../services/apiError'
import type {
  AnalyticsResponse,
  AnswerMode,
  ChatRequest,
  ChatResponse,
  ConversationOut,
  DocumentOut,
  FusedRow,
  HealthResponse,
  IngestionProgress,
  IngestionStage,
  KbStatus,
  MessageOut,
  RetrievalMode,
  RetrievalTrace,
  SourceOut,
  TraceHit,
} from '../types'
import { Bm25Index, tokenize } from './bm25'
import { CHUNKS, DOCUMENTS, EVAL_ROWS, QUESTIONS, type DemoChunk, type DemoDocument, type DemoQuestion } from './data'

export const DEMO_MODEL = 'llama3.2:3b'
export const NO_ANSWER_TEXT = 'I could not find this in the uploaded documents.'
const RRF_K = 60
const TOP_K = 5
const MIN_SEMANTIC = 0.25
const MAX_FILE_BYTES = 10 * 1024 * 1024
const TITLE_CHARS = 60

const CHUNK_BY_ID = new Map<number, DemoChunk>(CHUNKS.map((c) => [c.id, c]))
const SAMPLE_BY_ID = new Map<string, DemoDocument>(DOCUMENTS.map((d) => [d.id, d]))
const INITIAL_SAMPLES = ['Employee_Handbook.pdf', 'Remote_Work_Policy.pdf', 'IT_Security_Policy.pdf']

export const INGESTION_STAGES: { stage: IngestionStage; label: string; detail: string; ms: number }[] = [
  { stage: 'upload', label: 'Validate and store', detail: 'PDF type, size limit, duplicate check', ms: 500 },
  { stage: 'parse', label: 'Extract text', detail: 'Page by page with PyMuPDF', ms: 900 },
  { stage: 'chunk', label: 'Split into passages', detail: '200-token windows, never across pages', ms: 800 },
  { stage: 'embed', label: 'Embed passages', detail: 'all-MiniLM-L6-v2, 384 dimensions', ms: 1300 },
  { stage: 'index', label: 'Index for search', detail: 'FAISS vectors and BM25 keywords', ms: 700 },
]

// ---------------------------------------------------------------- state

interface StoredDoc {
  doc: DocumentOut
  /** Id of the sample document whose passages become searchable, or null for a simulated upload. */
  sampleId: string | null
  fingerprint: string
}

interface State {
  docs: StoredDoc[]
  conversations: ConversationOut[]
  messages: Map<string, MessageOut[]>
  ingestions: Map<string, IngestionProgress>
  nextMessageId: number
}

const listeners = new Set<() => void>()
let state: State = { docs: [], conversations: [], messages: new Map(), ingestions: new Map(), nextMessageId: 1 }
let version = 0

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getVersion(): number {
  return version
}

const STORAGE_KEY = 'insightvault-demo-v1'

interface SavedState {
  docs: StoredDoc[]
  conversations: ConversationOut[]
  messages: [string, MessageOut[]][]
  nextMessageId: number
}

/** Keep the demo's state for the browser session so a page refresh does not undo uploads or chats. */
function save(): void {
  try {
    const saved: SavedState = {
      docs: state.docs,
      conversations: state.conversations,
      messages: [...state.messages.entries()],
      nextMessageId: state.nextMessageId,
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch {
    /* storage unavailable (private mode, server render): the demo still works in memory */
  }
}

function load(): State | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as SavedState
    for (const d of saved.docs) {
      if (d.doc.status === 'processing') {
        // An upload interrupted by the refresh finishes immediately.
        const sample = d.sampleId ? SAMPLE_BY_ID.get(d.sampleId) : null
        d.doc.status = 'ready'
        d.doc.page_count = d.doc.page_count ?? sample?.page_count ?? 1
        d.doc.chunk_count = sample ? CHUNKS.filter((c) => c.document_id === sample.id).length : Math.max(1, d.doc.chunk_count)
      }
    }
    return {
      docs: saved.docs,
      conversations: saved.conversations,
      messages: new Map(saved.messages),
      ingestions: new Map(),
      nextMessageId: saved.nextMessageId,
    }
  } catch {
    return null
  }
}

function emit(): void {
  version += 1
  save()
  for (const l of listeners) l()
}

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function hexId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function sampleDoc(sample: DemoDocument, uploadedAt: string): StoredDoc {
  return {
    sampleId: sample.id,
    fingerprint: `${sample.filename}:${sample.file_size}`,
    doc: {
      id: hexId(),
      filename: sample.filename,
      file_size: sample.file_size,
      page_count: sample.page_count,
      status: 'ready',
      error_message: null,
      chunk_count: CHUNKS.filter((c) => c.document_id === sample.id).length,
      uploaded_at: uploadedAt,
      demo_note: null,
    },
  }
}

function createInitialState(): State {
  const fresh: State = { docs: [], conversations: [], messages: new Map(), ingestions: new Map(), nextMessageId: 1 }
  INITIAL_SAMPLES.forEach((name, i) => {
    const sample = DOCUMENTS.find((d) => d.filename === name)
    if (sample) fresh.docs.unshift(sampleDoc(sample, isoMinutesAgo(60 * 24 * (3 - i) + 17 * i)))
  })
  // Two earlier conversations so the dashboard and history are not empty.
  state = fresh
  seedConversation('How many days of annual leave do full-time employees get?', 60 * 26)
  seedConversation('What does SEC-117 require?', 60 * 5)
  return fresh
}

function seedConversation(question: string, minutesAgo: number): void {
  const result = answer(question, 'hybrid')
  const id = hexId()
  const at = isoMinutesAgo(minutesAgo)
  state.conversations.unshift({ id, title: question.slice(0, TITLE_CHARS), created_at: at })
  state.messages.set(id, [
    message('user', question, at),
    message('assistant', result.answer, at, result),
  ])
}

function message(role: 'user' | 'assistant', content: string, at: string, result?: AnswerResult): MessageOut {
  return {
    id: state.nextMessageId++,
    role,
    content,
    answer_mode: result ? result.answerMode : null,
    sources: result ? result.sources : null,
    created_at: at,
    retrieval_mode: result?.trace.mode,
    trace: result?.trace,
  }
}

export function resetDemo(): void {
  for (const progress of state.ingestions.values()) timers.get(progress.document_id)?.forEach(clearTimeout)
  timers.clear()
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  state = createInitialState()
  emit()
}

// ---------------------------------------------------------------- availability

function searchableChunkIds(): Set<number> {
  const ready = new Set(state.docs.filter((d) => d.doc.status === 'ready' && d.sampleId).map((d) => d.sampleId))
  return new Set(CHUNKS.filter((c) => ready.has(c.document_id)).map((c) => c.id))
}

function documentNameForSample(sampleId: string): string {
  return SAMPLE_BY_ID.get(sampleId)?.filename ?? 'Document'
}

function liveDocIdForSample(sampleId: string): string {
  return state.docs.find((d) => d.sampleId === sampleId)?.doc.id ?? sampleId
}

let bm25Cache: { key: string; index: Bm25Index } | null = null
function keywordIndex(available: Set<number>): Bm25Index {
  const key = [...available].sort((a, b) => a - b).join(',')
  if (!bm25Cache || bm25Cache.key !== key) {
    bm25Cache = {
      key,
      index: new Bm25Index(CHUNKS.filter((c) => available.has(c.id)).map((c) => ({ id: c.id, text: c.content }))),
    }
  }
  return bm25Cache.index
}

// ---------------------------------------------------------------- retrieval (mirrors hybrid_search.py)

interface Candidate {
  chunk_id: number
  rrf: number
  semantic: number | null
  keyword: number | null
  semanticRank: number | null
  keywordRank: number | null
}

function fuse(semantic: [number, number][], keyword: [number, number][]): Candidate[] {
  const map = new Map<number, Candidate>()
  const get = (id: number): Candidate => {
    let c = map.get(id)
    if (!c) {
      c = { chunk_id: id, rrf: 0, semantic: null, keyword: null, semanticRank: null, keywordRank: null }
      map.set(id, c)
    }
    return c
  }
  semantic.forEach(([id, score], i) => {
    const c = get(id)
    c.rrf += 1 / (RRF_K + i + 1)
    c.semantic = score
    c.semanticRank = i + 1
  })
  keyword.forEach(([id, score], i) => {
    const c = get(id)
    c.rrf += 1 / (RRF_K + i + 1)
    c.keyword = score
    c.keywordRank = i + 1
  })
  return [...map.values()].sort(
    (a, b) =>
      b.rrf - a.rrf ||
      (b.semantic ?? Number.NEGATIVE_INFINITY) - (a.semantic ?? Number.NEGATIVE_INFINITY) ||
      a.chunk_id - b.chunk_id,
  )
}

function duplicateReason(chunk: DemoChunk, tokens: Set<string>, selected: { chunk: DemoChunk; tokens: Set<string> }[]): string | null {
  const text = chunk.content.trim()
  for (const other of selected) {
    if (text && other.chunk.content.includes(text)) return 'Contained in a higher-ranked passage'
    if (chunk.document_id === other.chunk.document_id && chunk.page === other.chunk.page && tokens.size > 0) {
      let shared = 0
      for (const t of tokens) if (other.tokens.has(t)) shared += 1
      if (shared / tokens.size >= 0.8) return 'Near-duplicate of a passage on the same page'
    }
  }
  return null
}

interface RetrievalRun {
  results: Candidate[]
  fusedRows: FusedRow[]
  semanticHits: TraceHit[] | null
  keywordHits: TraceHit[] | null
  tokens: string[]
  custom: boolean
}

function toHits(list: [number, number][]): TraceHit[] {
  return list.slice(0, 10).map(([id, score]) => {
    const c = CHUNK_BY_ID.get(id)
    return {
      chunk_id: id,
      document_name: c ? documentNameForSample(c.document_id) : '',
      page: c?.page ?? 0,
      score: Math.round(score * 10_000) / 10_000,
    }
  })
}

function normalize(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9-]+/g, ' ').trim()
}

export function findCurated(question: string): DemoQuestion | null {
  const n = normalize(question)
  return QUESTIONS.find((q) => normalize(q.question) === n) ?? null
}

function retrieve(question: string, mode: RetrievalMode): RetrievalRun {
  const available = searchableChunkIds()
  const curated = findCurated(question)
  let semantic: [number, number][] | null
  let keyword: [number, number][]
  if (curated) {
    semantic = curated.semantic_ranked.filter(([id]) => available.has(id))
    keyword = curated.bm25_ranked.filter(([id]) => available.has(id))
  } else {
    semantic = null
    keyword = keywordIndex(available).search(question, 20)
  }
  const useSemantic = mode !== 'keyword' && semantic !== null
  const useKeyword = mode === 'keyword' || mode === 'hybrid' || semantic === null
  const candidates = fuse(useSemantic && semantic ? semantic : [], useKeyword ? keyword : [])

  const selected: { chunk: DemoChunk; tokens: Set<string> }[] = []
  const results: Candidate[] = []
  const fusedRows: FusedRow[] = []
  for (const cand of candidates) {
    const chunk = CHUNK_BY_ID.get(cand.chunk_id)
    if (!chunk) continue
    let reason: string | null = null
    if (results.length >= TOP_K) reason = 'Below the top 5'
    else {
      const tokens = new Set(tokenize(chunk.content))
      reason = duplicateReason(chunk, tokens, selected)
      if (!reason) {
        selected.push({ chunk, tokens })
        results.push(cand)
      }
    }
    if (fusedRows.length < 10) {
      fusedRows.push({
        chunk_id: cand.chunk_id,
        document_name: documentNameForSample(chunk.document_id),
        page: chunk.page,
        semantic_rank: cand.semanticRank,
        keyword_rank: cand.keywordRank,
        rrf_score: cand.rrf,
        selected: reason === null,
        skipped_reason: reason,
      })
    }
  }
  return {
    results,
    fusedRows,
    semanticHits: useSemantic && semantic ? toHits(semantic) : null,
    keywordHits: useKeyword ? toHits(keyword) : null,
    tokens: curated ? curated.tokens : tokenize(question),
    custom: curated === null,
  }
}

function passesGate(results: Candidate[]): { passed: boolean; best: number | null; keywordHit: boolean } {
  const sem = results.map((r) => r.semantic).filter((s): s is number => s !== null)
  const best = sem.length ? Math.max(...sem) : null
  const keywordHit = results.some((r) => r.keyword !== null && r.keyword > 0)
  return { passed: results.length > 0 && ((best !== null && best >= MIN_SEMANTIC) || keywordHit), best, keywordHit }
}

function toSources(results: Candidate[], cited: Set<number>): SourceOut[] {
  return results.map((r, i) => {
    const c = CHUNK_BY_ID.get(r.chunk_id) as DemoChunk
    return {
      ref: i + 1,
      chunk_id: r.chunk_id,
      document_id: liveDocIdForSample(c.document_id),
      document_name: documentNameForSample(c.document_id),
      page: c.page,
      content: c.content,
      semantic_score: r.semantic,
      bm25_score: r.keyword,
      rrf_score: Math.round(r.rrf * 1_000_000) / 1_000_000,
      cited: cited.has(i + 1),
    }
  })
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Extractive answer for questions without a pre-written one: best matching sentences, cited. */
function extractiveAnswer(question: string, results: Candidate[]): { text: string; cited: Set<number> } | null {
  const q = new Set(tokenize(question))
  const scored: { sentence: string; ref: number; score: number }[] = []
  results.slice(0, 3).forEach((r, i) => {
    const c = CHUNK_BY_ID.get(r.chunk_id)
    if (!c) return
    const body = c.content
      .split('\n')
      .filter((line, idx) => !line.startsWith('Halcyon Dynamics Ltd.') && !(idx === 0 && !line.includes('.')))
      .join(' ')
    for (const sentence of body.split(/(?<=[.!?])\s+/)) {
      const words = new Set(tokenize(sentence))
      let score = 0
      for (const t of q) if (words.has(t)) score += 1
      if (score > 0) scored.push({ sentence: sentence.trim(), ref: i + 1, score: score - i * 0.1 })
    }
  })
  scored.sort((a, b) => b.score - a.score)
  const needed = Math.min(2, q.size)
  if (!scored.length || scored[0].score < needed - 0.25) return null
  const picked = scored.slice(0, 2).filter((s, i) => i === 0 || s.score >= needed - 0.25)
  return {
    text: picked.map((p) => `${p.sentence.replace(/\.$/, '')} [${p.ref}].`).join(' '),
    cited: new Set(picked.map((p) => p.ref)),
  }
}

interface AnswerResult {
  answer: string
  answerMode: AnswerMode
  sources: SourceOut[]
  trace: RetrievalTrace
  latencyMs: number
}

function answer(question: string, mode: RetrievalMode): AnswerResult {
  const run = retrieve(question, mode)
  const gate = passesGate(run.results)
  const h = hash(question + mode)
  const timings = {
    embed: run.custom || mode === 'keyword' ? 0 : 9 + (h % 7),
    semantic: run.custom || mode === 'keyword' ? 0 : 1 + (h % 3),
    keyword: mode === 'semantic' && !run.custom ? 0 : 1 + ((h >> 3) % 2),
    fuse: 1,
    generate: 0,
  }
  let answerText = NO_ANSWER_TEXT
  let answerMode: AnswerMode = 'no_answer'
  let sources: SourceOut[] = []
  let promptInfo: RetrievalTrace['prompt'] = null

  if (gate.passed) {
    promptInfo = {
      sources: run.results.length,
      chars: run.results.reduce((n, r) => n + (CHUNK_BY_ID.get(r.chunk_id)?.content.length ?? 0), 0),
    }
    timings.generate = 2300 + (h % 1900)
    const curated = findCurated(question)
    const refByChunk = new Map(run.results.map((r, i) => [r.chunk_id, i + 1]))
    let cited = new Set<number>()
    if (curated) {
      const template = curated.answer
      const ids = template ? [...template.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1])) : []
      if (template && ids.every((id) => refByChunk.has(id))) {
        answerText = template.replace(/\{(\d+)\}/g, (_, id: string) => `[${refByChunk.get(Number(id))}]`)
        cited = new Set(ids.map((id) => refByChunk.get(id) as number))
        answerMode = 'generated'
      }
    } else {
      const extract = extractiveAnswer(question, run.results)
      if (extract) {
        answerText = extract.text
        cited = extract.cited
        answerMode = 'generated'
      }
    }
    sources = toSources(run.results, cited)
  }

  const trace: RetrievalTrace = {
    question,
    mode,
    custom: run.custom,
    query_tokens: run.tokens,
    semantic: run.semanticHits,
    keyword: run.keywordHits,
    fused: run.fusedRows,
    gate: { threshold: MIN_SEMANTIC, best_semantic: gate.best, keyword_hit: gate.keywordHit, passed: gate.passed },
    prompt: promptInfo,
    timings_ms: timings,
  }
  const latencyMs = timings.embed + timings.semantic + timings.keyword + timings.fuse + timings.generate + 40
  return { answer: answerText, answerMode, sources, trace, latencyMs }
}

// ---------------------------------------------------------------- simulated latency

function wait(ms: number): Promise<void> {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return new Promise((resolve) => setTimeout(resolve, reduced ? Math.min(ms, 150) : ms))
}

/** Time the assistant spends "thinking" in the demo; the UI steps through retrieval stages meanwhile. */
export const CHAT_DELAY_MS = 2200

// ---------------------------------------------------------------- API surface (mirrors services/api.ts)

function readyVectors(): number {
  return state.docs.filter((d) => d.doc.status === 'ready').reduce((n, d) => n + d.doc.chunk_count, 0)
}

export async function getHealth(): Promise<HealthResponse> {
  await wait(80)
  return {
    status: 'ok',
    demo_mode: true,
    index_vectors: readyVectors(),
    llm: { reachable: true, model: DEMO_MODEL, model_available: true },
  }
}

export async function listDocuments(): Promise<DocumentOut[]> {
  await wait(120)
  return state.docs.map((d) => ({ ...d.doc }))
}

export async function getDocument(id: string): Promise<DocumentOut> {
  await wait(60)
  const found = state.docs.find((d) => d.doc.id === id)
  if (!found) throw new ApiError(404, { code: 'not_found', message: 'Document not found.' })
  return { ...found.doc }
}

function countPdfPages(bytes: Uint8Array): number {
  const text = new TextDecoder('latin1').decode(bytes)
  const matches = text.match(/\/Type\s*\/Page(?![a-zA-Z])/g)
  return Math.max(1, matches?.length ?? 1)
}

const timers = new Map<string, ReturnType<typeof setTimeout>[]>()

function runIngestion(stored: StoredDoc, pages: number): void {
  const id = stored.doc.id
  const sample = stored.sampleId ? SAMPLE_BY_ID.get(stored.sampleId) : null
  const chunkCount = sample ? CHUNKS.filter((c) => c.document_id === sample.id).length : Math.max(1, Math.round(pages * 1.3))
  const progress: IngestionProgress = {
    document_id: id,
    filename: stored.doc.filename,
    stage: 'upload',
    pages: null,
    chunks: null,
    searchable: Boolean(sample),
  }
  state.ingestions.set(id, progress)
  const handles: ReturnType<typeof setTimeout>[] = []
  let elapsed = 0
  const order: IngestionStage[] = ['parse', 'chunk', 'embed', 'index', 'ready']
  INGESTION_STAGES.forEach((step, i) => {
    elapsed += step.ms
    handles.push(
      setTimeout(() => {
        const next = order[i]
        const p = state.ingestions.get(id)
        if (!p) return
        p.stage = next
        if (next === 'chunk' || next === 'embed') p.pages = pages
        if (next === 'embed') p.chunks = chunkCount
        if (next === 'ready') {
          stored.doc.status = 'ready'
          stored.doc.page_count = pages
          stored.doc.chunk_count = chunkCount
        }
        emit()
      }, elapsed),
    )
  })
  timers.set(id, handles)
}

export function getIngestion(id: string): IngestionProgress | null {
  const p = state.ingestions.get(id)
  return p ? { ...p } : null
}

export function latestIngestion(): IngestionProgress | null {
  const all = [...state.ingestions.values()]
  return all.length ? { ...all[all.length - 1] } : null
}

function addDocument(filename: string, size: number, fingerprint: string, sampleId: string | null, pages: number): DocumentOut {
  const existing = state.docs.find((d) => d.fingerprint === fingerprint)
  if (existing) {
    throw new ApiError(409, {
      code: 'duplicate_document',
      message: `This file was already uploaded as '${existing.doc.filename}'.`,
      document_id: existing.doc.id,
    })
  }
  const stored: StoredDoc = {
    sampleId,
    fingerprint,
    doc: {
      id: hexId(),
      filename,
      file_size: size,
      page_count: null,
      status: 'processing',
      error_message: null,
      chunk_count: 0,
      uploaded_at: isoMinutesAgo(0),
      demo_note: sampleId
        ? null
        : 'Simulated upload: the browser demo shows the pipeline but only the sample PDFs are searchable.',
    },
  }
  state.docs.unshift(stored)
  runIngestion(stored, pages)
  emit()
  return { ...stored.doc }
}

export async function uploadDocument(file: File, onProgress?: (percent: number) => void): Promise<DocumentOut> {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    throw new ApiError(400, { code: 'invalid_file_type', message: 'Only PDF files are supported.' })
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ApiError(413, { code: 'file_too_large', message: 'File exceeds the 10 MB limit.' })
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const magic = new TextDecoder('latin1').decode(bytes.slice(0, 5))
  if (magic !== '%PDF-') throw new ApiError(400, { code: 'invalid_file_type', message: 'The file is not a valid PDF.' })
  for (const pct of [25, 60, 100]) {
    onProgress?.(pct)
    await wait(120)
  }
  const sample = DOCUMENTS.find((d) => d.filename === file.name && d.file_size === file.size) ?? null
  return addDocument(file.name, file.size, `${file.name}:${file.size}`, sample?.id ?? null, sample?.page_count ?? countPdfPages(bytes))
}

/** Missing sample documents that can be added with one click. */
export function availableSamples(): DemoDocument[] {
  const present = new Set(state.docs.map((d) => d.sampleId))
  return DOCUMENTS.filter((d) => !present.has(d.id))
}

export async function addSample(sampleId: string): Promise<DocumentOut> {
  const sample = SAMPLE_BY_ID.get(sampleId)
  if (!sample) throw new ApiError(404, { code: 'not_found', message: 'Sample not found.' })
  await wait(250)
  return addDocument(sample.filename, sample.file_size, `${sample.filename}:${sample.file_size}`, sample.id, sample.page_count)
}

export async function deleteDocument(id: string): Promise<void> {
  await wait(300)
  const found = state.docs.find((d) => d.doc.id === id)
  if (!found) throw new ApiError(404, { code: 'not_found', message: 'Document not found.' })
  if (found.doc.status === 'processing') {
    throw new ApiError(409, { code: 'document_processing', message: 'Wait for processing to finish before deleting.' })
  }
  state.docs = state.docs.filter((d) => d.doc.id !== id)
  state.ingestions.delete(id)
  emit()
}

export async function sendChat(body: ChatRequest): Promise<ChatResponse> {
  const question = body.question.trim()
  if (!question || question.length > 1000) {
    throw new ApiError(422, { code: 'validation_error', message: 'question: must be 1 to 1000 characters' })
  }
  if (body.conversation_id && !state.messages.has(body.conversation_id)) {
    throw new ApiError(404, { code: 'not_found', message: 'Conversation not found.' })
  }
  await wait(CHAT_DELAY_MS)
  const result = answer(question, body.retrieval_mode)
  let conversationId = body.conversation_id
  const now = isoMinutesAgo(0)
  if (!conversationId) {
    conversationId = hexId()
    state.conversations.unshift({ id: conversationId, title: question.slice(0, TITLE_CHARS), created_at: now })
    state.messages.set(conversationId, [])
  }
  const thread = state.messages.get(conversationId) as MessageOut[]
  thread.push(message('user', question, now), message('assistant', result.answer, now, result))
  emit()
  return {
    conversation_id: conversationId,
    answer: result.answer,
    answer_mode: result.answerMode,
    retrieval_mode: body.retrieval_mode,
    model: DEMO_MODEL,
    latency_ms: result.latencyMs,
    sources: result.sources,
    trace: result.trace,
  }
}

/** Run one question through all three retrieval modes without saving anything. */
export function compareModes(question: string): Record<RetrievalMode, { sources: SourceOut[]; passed: boolean; custom: boolean }> {
  const out = {} as Record<RetrievalMode, { sources: SourceOut[]; passed: boolean; custom: boolean }>
  for (const mode of ['hybrid', 'semantic', 'keyword'] as const) {
    const run = retrieve(question, mode)
    out[mode] = { sources: toSources(run.results, new Set()), passed: passesGate(run.results).passed, custom: run.custom }
  }
  return out
}

export async function listConversations(): Promise<ConversationOut[]> {
  await wait(80)
  return state.conversations.map((c) => ({ ...c }))
}

export async function getConversationMessages(id: string): Promise<MessageOut[]> {
  await wait(120)
  const thread = state.messages.get(id)
  if (!thread) throw new ApiError(404, { code: 'not_found', message: 'Conversation not found.' })
  return thread.map((m) => ({ ...m }))
}

export async function getAnalytics(): Promise<AnalyticsResponse> {
  await wait(150)
  const docs = state.docs.map((d) => d.doc)
  const questions: { question: string; asked_at: string; answer_mode: AnswerMode | null }[] = []
  for (const conv of state.conversations) {
    const thread = state.messages.get(conv.id) ?? []
    thread.forEach((m, i) => {
      if (m.role === 'user') questions.push({ question: m.content, asked_at: m.created_at, answer_mode: thread[i + 1]?.answer_mode ?? null })
    })
  }
  questions.sort((a, b) => b.asked_at.localeCompare(a.asked_at))
  let kb: KbStatus = 'ready'
  if (docs.length === 0) kb = 'empty'
  else if (docs.some((d) => d.status === 'processing')) kb = 'processing'
  return {
    total_documents: docs.length,
    ready_documents: docs.filter((d) => d.status === 'ready').length,
    total_chunks: docs.reduce((n, d) => n + d.chunk_count, 0),
    total_questions: questions.length,
    index_vectors: readyVectors(),
    recent_documents: docs.slice(0, 5).map((d) => ({ ...d })),
    recent_questions: questions.slice(0, 5),
    kb_status: kb,
  }
}

export async function getDemoQuestions(): Promise<{ questions: string[] }> {
  await wait(50)
  return { questions: QUESTIONS.filter((q) => q.group !== 'Follow-up').map((q) => q.question) }
}

export function curatedQuestions(): DemoQuestion[] {
  return QUESTIONS
}

/** Full page text for the page viewer, with the passage to highlight. */
export function getPage(documentId: string, page: number): { filename: string; pageCount: number; text: string } | null {
  const stored = state.docs.find((d) => d.doc.id === documentId)
  const sample = stored?.sampleId ? SAMPLE_BY_ID.get(stored.sampleId) : null
  const p = sample?.pages.find((x) => x.page === page)
  return sample && p ? { filename: sample.filename, pageCount: sample.page_count, text: p.text } : null
}

export function isSearchable(documentId: string): boolean {
  return Boolean(state.docs.find((d) => d.doc.id === documentId)?.sampleId)
}

export { EVAL_ROWS }

state = (typeof window !== 'undefined' && load()) || createInitialState()
