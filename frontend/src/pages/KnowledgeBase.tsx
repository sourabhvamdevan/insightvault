import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DocumentTable } from '../components/DocumentTable'
import { ErrorBanner } from '../components/ErrorBanner'
import { PlusIcon } from '../components/Icons'
import { IngestionPanel } from '../components/IngestionPanel'
import { PageViewer } from '../components/PageViewer'
import { UploadZone } from '../components/UploadZone'
import { addSample, availableSamples } from '../demo/engine'
import { useAppContext } from '../hooks/useAppContext'
import { useDocuments } from '../hooks/useDocuments'
import { ApiError, DEMO_MODE } from '../services/api'
import type { DocumentOut } from '../types'
import { formatBytes } from '../utils/format'

export function KnowledgeBase() {
  const { health } = useAppContext()
  const { documents, loading, error, refresh, upload, remove } = useDocuments()
  const [params, setParams] = useSearchParams()
  const [sampleError, setSampleError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<DocumentOut | null>(null)
  const handled = useRef('')
  const readOnly = !DEMO_MODE && (health.health?.demo_mode ?? false)
  const samples = DEMO_MODE ? availableSamples() : []

  async function handleAddSample(id: string) {
    setSampleError(null)
    try {
      await addSample(id)
    } catch (err) {
      setSampleError(err instanceof ApiError ? err.message : 'Could not add the sample.')
    }
  }

  // ?add=<sample filename> starts indexing a sample (used by the tour and the overview).
  useEffect(() => {
    const name = params.get('add')
    if (!name || handled.current === name || !DEMO_MODE) return
    handled.current = name
    const sample = availableSamples().find((s) => s.filename === name)
    if (sample) void handleAddSample(sample.id)
    setParams({}, { replace: true })
  }, [params, setParams])

  async function handleDelete(id: string) {
    await remove(id)
  }

  async function handleUpload(file: File, onProgress: (percent: number) => void) {
    await upload(file, onProgress)
  }

  return (
    <div className="mx-auto max-w-6xl px-10 py-10">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink-900">Knowledge base</h1>
        <p className="mt-1.5 max-w-2xl text-ink-600">
          Every PDF is read page by page and split into passages, so an answer can always point to the exact page it used.
        </p>
      </header>

      <div className="mt-8 space-y-6">
        {readOnly && (
          <ErrorBanner variant="info" message="This deployment is read-only. Uploads and deletes are disabled." />
        )}

        <div className={`grid gap-6 ${samples.length ? 'lg:grid-cols-[1fr_20rem]' : ''}`}>
          <UploadZone onUpload={handleUpload} disabled={readOnly} />
          {samples.length > 0 && (
            <div className="rounded-2xl border border-ink-200 bg-white px-5 py-5">
              <h2 className="font-semibold text-ink-900">No PDF to hand?</h2>
              <p className="mt-0.5 text-sm text-ink-500">Add a sample policy. It becomes searchable once indexed.</p>
              <ul className="mt-3 space-y-2">
                {samples.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => void handleAddSample(s.id)}
                      className="flex w-full items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-left text-sm hover:border-signal-500 hover:bg-signal-50"
                    >
                      <PlusIcon className="h-4 w-4 shrink-0 text-signal-600" />
                      <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{s.filename}</span>
                      <span className="shrink-0 text-xs text-ink-500">
                        {s.page_count} pages, {formatBytes(s.file_size)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {sampleError && <p className="mt-2 text-sm text-red-600">{sampleError}</p>}
            </div>
          )}
        </div>

        {DEMO_MODE && <IngestionPanel />}

        {error && <ErrorBanner title="Could not load documents" message={error.message} onRetry={() => void refresh()} />}

        {loading ? (
          <p className="text-sm text-ink-500">Loading documents…</p>
        ) : documents.length === 0 ? (
          !error && (
            <p className="rounded-2xl border border-ink-200 bg-white px-6 py-10 text-center text-sm text-ink-500">
              Nothing indexed yet. Upload a PDF above to get started.
            </p>
          )
        ) : (
          <DocumentTable
            documents={documents}
            onDelete={handleDelete}
            onView={DEMO_MODE ? setViewing : undefined}
            readOnly={readOnly}
          />
        )}
      </div>

      {viewing && (
        <PageViewer documentId={viewing.id} documentName={viewing.filename} page={1} support={null} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}
