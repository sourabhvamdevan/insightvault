import { useRef, useState, type DragEvent } from 'react'
import { ApiError } from '../services/api'
import { ErrorBanner } from './ErrorBanner'
import { UploadIcon } from './Icons'

const MAX_MB = 10
const MAX_BYTES = MAX_MB * 1024 * 1024

interface Props {
  onUpload: (file: File, onProgress: (percent: number) => void) => Promise<unknown>
  disabled?: boolean
}

interface Notice {
  kind: 'error' | 'info'
  text: string
}

function validate(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.pdf')) return `${file.name}: only PDF files are supported.`
  if (file.size > MAX_BYTES) return `${file.name}: file exceeds the ${MAX_MB} MB limit.`
  if (file.size === 0) return `${file.name}: the file is empty.`
  return null
}

export function UploadZone({ onUpload, disabled = false }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [current, setCurrent] = useState<{ name: string; percent: number } | null>(null)
  const [notices, setNotices] = useState<Notice[]>([])
  const busy = current !== null

  async function handleFiles(list: FileList | null) {
    if (!list || disabled || busy) return
    const files = Array.from(list)
    const next: Notice[] = []
    for (const file of files) {
      const problem = validate(file)
      if (problem) {
        next.push({ kind: 'error', text: problem })
        continue
      }
      setCurrent({ name: file.name, percent: 0 })
      try {
        await onUpload(file, (percent) => setCurrent({ name: file.name, percent }))
        next.push({ kind: 'info', text: `${file.name} uploaded. Indexing has started.` })
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Upload failed.'
        next.push({ kind: 'error', text: `${file.name}: ${message}` })
      }
    }
    setCurrent(null)
    setNotices(next)
    if (input.current) input.current.value = ''
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    void handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && !busy && input.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !busy) input.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          disabled
            ? 'cursor-not-allowed border-ink-200 bg-ink-50 text-ink-400'
            : dragging
              ? 'cursor-copy border-signal-500 bg-signal-50'
              : 'cursor-pointer border-ink-300 bg-white hover:border-signal-500 hover:bg-ink-50'
        }`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-signal-50 text-signal-600">
          <UploadIcon />
        </div>
        {busy ? (
          <div className="mt-3 w-full max-w-xs">
            <p className="truncate text-sm font-medium text-ink-700">Uploading {current.name}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-200">
              <div className="h-full bg-signal-500 transition-all" style={{ width: `${current.percent}%` }} />
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm font-medium text-ink-700">
              {disabled ? 'Uploads are disabled on this deployment' : 'Drop PDFs here, or choose files'}
            </p>
            <p className="mt-1 text-xs text-ink-500">Text-based PDFs only · up to {MAX_MB} MB each</p>
          </>
        )}
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
      {notices.map((n, i) => (
        <ErrorBanner
          key={`${n.text}-${i}`}
          variant={n.kind === 'error' ? 'error' : 'info'}
          message={n.text}
          onDismiss={() => setNotices((prev) => prev.filter((_, j) => j !== i))}
        />
      ))}
    </div>
  )
}
