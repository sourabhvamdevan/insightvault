import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, deleteDocument, listDocuments, subscribeToChanges, uploadDocument } from '../services/api'
import type { DocumentOut } from '../types'

const POLL_MS = 2000

export interface DocumentsState {
  documents: DocumentOut[]
  loading: boolean
  error: ApiError | null
  refresh: () => Promise<void>
  upload: (file: File, onProgress?: (percent: number) => void) => Promise<DocumentOut>
  remove: (id: string) => Promise<void>
  clearError: () => void
}

/** Document list with automatic polling while any document is still processing. */
export function useDocuments(): DocumentsState {
  const [documents, setDocuments] = useState<DocumentOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const docs = await listDocuments()
      if (mounted.current) {
        setDocuments(docs)
        setError(null)
      }
    } catch (err) {
      if (mounted.current && err instanceof ApiError) setError(err)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh()
    return () => {
      mounted.current = false
    }
  }, [refresh])

  useEffect(() => subscribeToChanges(() => void refresh()), [refresh])

  const processing = documents.some((d) => d.status === 'processing')
  useEffect(() => {
    if (!processing) return
    const timer = window.setInterval(() => void refresh(), POLL_MS)
    return () => window.clearInterval(timer)
  }, [processing, refresh])

  const upload = useCallback(
    async (file: File, onProgress?: (percent: number) => void) => {
      const doc = await uploadDocument(file, onProgress)
      setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)])
      return doc
    },
    [],
  )

  const remove = useCallback(async (id: string) => {
    await deleteDocument(id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { documents, loading, error, refresh, upload, remove, clearError }
}
