// Typed HTTP client. Every request in the app goes through this module.
import axios, { type AxiosProgressEvent, type AxiosResponse } from 'axios'
import * as demo from '../demo/engine'
import { ApiError } from './apiError'
import type {
  AnalyticsResponse,
  ChatRequest,
  ChatResponse,
  ConversationOut,
  DemoQuestionsResponse,
  DocumentOut,
  ErrorDetail,
  HealthResponse,
  MessageOut,
  SourceOut,
} from '../types'

/**
 * Demo mode runs entirely in the browser with recorded retrieval results (src/demo). It is the default.
 * `npm run dev:live` / `npm run build:live` (vite --mode live) or VITE_DEMO_MODE=false use the FastAPI backend.
 */
export const DEMO_MODE = import.meta.env.MODE !== 'live' && (import.meta.env.VITE_DEMO_MODE as string | undefined) !== 'false'

const baseURL = `${(import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''}/api`

export { ApiError }

const http = axios.create({
  baseURL,
  // Local LLM answers can take a while on CPU; the backend times out at OLLAMA_TIMEOUT_S.
  timeout: 180_000,
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readErrorDetail(data: unknown): ErrorDetail | null {
  if (!isRecord(data) || !isRecord(data.error)) return null
  const { code, message, document_id } = data.error
  if (typeof code !== 'string' || typeof message !== 'string') return null
  return { code, message, document_id: typeof document_id === 'string' ? document_id : null }
}

function readSources(data: unknown): SourceOut[] {
  if (!isRecord(data) || !Array.isArray(data.sources)) return []
  return data.sources as SourceOut[]
}

function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0
    const detail = readErrorDetail(err.response?.data)
    if (detail) return new ApiError(status, detail, readSources(err.response?.data))
    if (!err.response) {
      return new ApiError(0, {
        code: 'network_error',
        message: 'Cannot reach the API server. Is the backend running on port 8000?',
      })
    }
    return new ApiError(status, { code: 'http_error', message: `Request failed with status ${status}` })
  }
  return new ApiError(0, { code: 'unknown_error', message: err instanceof Error ? err.message : 'Unknown error' })
}

async function call<T>(promise: Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const res = await promise
    return res.data
  } catch (err) {
    throw toApiError(err)
  }
}

export function getHealth(): Promise<HealthResponse> {
  if (DEMO_MODE) return demo.getHealth()
  return call(http.get<HealthResponse>('/health'))
}

export function listDocuments(): Promise<DocumentOut[]> {
  if (DEMO_MODE) return demo.listDocuments()
  return call(http.get<DocumentOut[]>('/documents'))
}

export function getDocument(id: string): Promise<DocumentOut> {
  if (DEMO_MODE) return demo.getDocument(id)
  return call(http.get<DocumentOut>(`/documents/${encodeURIComponent(id)}`))
}

export function uploadDocument(file: File, onProgress?: (percent: number) => void): Promise<DocumentOut> {
  if (DEMO_MODE) return demo.uploadDocument(file, onProgress)
  const form = new FormData()
  form.append('file', file)
  return call(
    http.post<DocumentOut>('/documents/upload', form, {
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    }),
  )
}

export async function deleteDocument(id: string): Promise<void> {
  if (DEMO_MODE) return demo.deleteDocument(id)
  await call(http.delete<void>(`/documents/${encodeURIComponent(id)}`))
}

export function sendChat(body: ChatRequest): Promise<ChatResponse> {
  if (DEMO_MODE) return demo.sendChat(body)
  return call(http.post<ChatResponse>('/chat', body))
}

export function listConversations(): Promise<ConversationOut[]> {
  if (DEMO_MODE) return demo.listConversations()
  return call(http.get<ConversationOut[]>('/conversations'))
}

export function getConversationMessages(id: string): Promise<MessageOut[]> {
  if (DEMO_MODE) return demo.getConversationMessages(id)
  return call(http.get<MessageOut[]>(`/conversations/${encodeURIComponent(id)}/messages`))
}

export function getAnalytics(): Promise<AnalyticsResponse> {
  if (DEMO_MODE) return demo.getAnalytics()
  return call(http.get<AnalyticsResponse>('/analytics'))
}

export function getDemoQuestions(): Promise<DemoQuestionsResponse> {
  if (DEMO_MODE) return demo.getDemoQuestions()
  return call(http.get<DemoQuestionsResponse>('/demo/questions'))
}

/** Demo mode pushes changes (ingestion stages, new answers) instead of waiting for a poll. */
export function subscribeToChanges(listener: () => void): () => void {
  return DEMO_MODE ? demo.subscribe(listener) : () => undefined
}
