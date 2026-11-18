import { useState } from 'react'
import { ApiError } from '../services/api'
import type { DocumentOut } from '../types'
import { formatBytes, formatDate } from '../utils/format'
import { ErrorBanner } from './ErrorBanner'
import { FileIcon, TrashIcon } from './Icons'
import { StatusBadge } from './StatusBadge'

interface Props {
  documents: DocumentOut[]
  onDelete: (id: string) => Promise<void>
  onView?: (doc: DocumentOut) => void
  readOnly?: boolean
}

export function DocumentTable({ documents, onDelete, onView, readOnly = false }: Props) {
  const [confirming, setConfirming] = useState<DocumentOut | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmDelete() {
    if (!confirming) return
    setDeleting(true)
    setError(null)
    try {
      await onDelete(confirming.id)
      setConfirming(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <table className="min-w-full divide-y divide-ink-200 text-sm">
          <thead className="bg-ink-50 text-left text-xs font-medium text-ink-500">
            <tr>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Pages</th>
              <th className="px-4 py-3">Passages</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {documents.map((doc) => (
              <tr key={doc.id} className="align-top hover:bg-ink-50/60">
                <td className="max-w-xs px-4 py-3">
                  <div className="flex items-start gap-2">
                    <FileIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-800" title={doc.filename}>
                        {doc.filename}
                      </p>
                      {doc.status === 'failed' && doc.error_message && (
                        <p className="mt-1 text-xs text-red-600">{doc.error_message}</p>
                      )}
                      {doc.demo_note && <p className="mt-1 text-xs text-ink-500">{doc.demo_note}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-600">{formatBytes(doc.file_size)}</td>
                <td className="px-4 py-3 text-ink-600">{doc.page_count ?? '–'}</td>
                <td className="px-4 py-3 text-ink-600">{doc.status === 'ready' ? doc.chunk_count : '–'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={doc.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-600">{formatDate(doc.uploaded_at)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {onView && doc.status === 'ready' && !doc.demo_note && (
                    <button
                      type="button"
                      onClick={() => onView(doc)}
                      className="mr-1 rounded-md px-2 py-1 text-xs font-medium text-signal-700 hover:bg-signal-50"
                    >
                      Read pages
                    </button>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null)
                        setConfirming(doc)
                      }}
                      disabled={doc.status === 'processing'}
                      className="rounded-md p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Delete ${doc.filename}`}
                      title={doc.status === 'processing' ? 'Wait for processing to finish' : 'Delete'}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-ink-900">Delete document?</h2>
            <p className="mt-2 text-sm text-ink-600">
              <span className="font-medium text-ink-800">{confirming.filename}</span> and its {confirming.chunk_count}{' '}
              indexed chunks will be removed from the knowledge base. This cannot be undone.
            </p>
            {error && (
              <div className="mt-4">
                <ErrorBanner message={error} />
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={deleting}
                className="rounded-lg border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
