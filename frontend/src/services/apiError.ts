import type { ErrorDetail, SourceOut } from '../types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly sources: SourceOut[]
  readonly documentId: string | null

  constructor(status: number, detail: ErrorDetail, sources: SourceOut[] = []) {
    super(detail.message)
    this.name = 'ApiError'
    this.status = status
    this.code = detail.code
    this.sources = sources
    this.documentId = detail.document_id ?? null
  }
}
