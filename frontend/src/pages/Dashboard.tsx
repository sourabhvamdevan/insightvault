import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBanner } from '../components/ErrorBanner'
import { ChartIcon, ChatIcon, LibraryIcon, PlayIcon, SearchIcon } from '../components/Icons'
import { MODE_COLOR, MODE_LABEL } from '../components/modeStyles'
import { StatusBadge } from '../components/StatusBadge'
import { availableSamples } from '../demo/engine'
import { EVAL_MODES, EVAL_ROWS, metrics } from '../demo/evaluation'
import { useTour } from '../hooks/useTour'
import { ApiError, DEMO_MODE, getAnalytics, listDocuments, subscribeToChanges } from '../services/api'
import type { AnalyticsResponse, AnswerMode, DocumentOut } from '../types'
import { formatDate } from '../utils/format'

const OUTCOME: Record<AnswerMode, { label: string; className: string }> = {
  generated: { label: 'Answered with citations', className: 'bg-signal-50 text-signal-700' },
  retrieval_only: { label: 'Evidence only', className: 'bg-ink-100 text-ink-600' },
  no_answer: { label: 'Not in the documents', className: 'bg-ink-100 text-ink-600' },
}

function Stage({ value, label, detail, last = false }: { value: ReactNode; label: string; detail: string; last?: boolean }) {
  return (
    <div className="relative flex-1 px-5 py-5">
      <p className="text-[32px] leading-none font-semibold tracking-tight text-ink-900">{value}</p>
      <p className="mt-2 text-sm font-medium text-ink-800">{label}</p>
      <p className="mt-0.5 text-xs leading-snug text-ink-500">{detail}</p>
      {!last && (
        <span
          aria-hidden="true"
          className="absolute top-1/2 -right-[9px] z-10 flex h-[18px] w-[18px] -translate-y-1/2 items-center justify-center rounded-full border border-ink-200 bg-white text-[10px] text-ink-400"
        >
          ›
        </span>
      )}
    </div>
  )
}

function shortName(name: string): string {
  return name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ')
}

export function Dashboard() {
  const tour = useTour()
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [documents, setDocuments] = useState<DocumentOut[]>([])
  const [error, setError] = useState<ApiError | null>(null)

  const load = useCallback(async () => {
    try {
      const [analytics, docs] = await Promise.all([getAnalytics(), listDocuments()])
      setData(analytics)
      setDocuments(docs)
      setError(null)
    } catch (err) {
      if (err instanceof ApiError) setError(err)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => subscribeToChanges(() => void load()), [load])

  const ready = documents.filter((d) => d.status === 'ready')
  const pages = ready.reduce((n, d) => n + (d.page_count ?? 0), 0)
  const maxChunks = Math.max(1, ...ready.map((d) => d.chunk_count))
  const sample = DEMO_MODE ? availableSamples()[0] : undefined
  const hybrid = metrics(EVAL_ROWS, 'hybrid')

  const workflows = [
    {
      to: sample ? `/knowledge-base?add=${encodeURIComponent(sample.filename)}` : '/knowledge-base',
      icon: LibraryIcon,
      title: 'Add a document',
      body: sample
        ? `Index the ${shortName(sample.filename)} and watch each stage of the pipeline.`
        : 'Upload a PDF and watch each stage of the pipeline.',
    },
    {
      to: '/assistant?ask=How many days per week can I work remotely?',
      icon: ChatIcon,
      title: 'Ask a question, check the source',
      body: 'Click a citation to open the page with the passage highlighted.',
    },
    {
      to: "/assistant?ask=When do I need a doctor's note for being ill?",
      icon: SearchIcon,
      title: 'See why hybrid search matters',
      body: 'A paraphrase that keyword search misses. Compare the three modes on the answer.',
    },
    {
      to: '/evaluation',
      icon: ChartIcon,
      title: 'Check search quality',
      body: `Hybrid ranks the right page first for ${Math.round(hybrid.hit1 * 100)}% of 30 test questions.`,
    },
  ]

  return (
    <div className="mx-auto max-w-6xl px-10 py-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-[34px] leading-[1.15] font-semibold tracking-tight text-ink-900">
            Answers from company PDFs, each traced to the page it came from
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
            Hybrid search finds the right passages, a local model answers from them alone, and every claim carries a citation
            you can open. When the documents don’t cover a question, it says so.
          </p>
        </div>
        <div className="flex gap-2">
          {DEMO_MODE && !tour.active && (
            <button
              type="button"
              onClick={tour.start}
              className="flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-ink-800"
            >
              <PlayIcon className="h-4 w-4" /> Take the 2-minute tour
            </button>
          )}
          <Link
            to="/assistant"
            className="rounded-lg border border-ink-300 bg-white px-4 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50"
          >
            Ask a question
          </Link>
        </div>
      </header>

      {error && (
        <div className="mt-6">
          <ErrorBanner title="Could not load the overview" message={error.message} onRetry={() => void load()} />
        </div>
      )}

      {data && (
        <>
          <section
            data-tour="pipeline"
            aria-label="Knowledge base pipeline"
            className="mt-9 flex divide-x divide-ink-200 rounded-2xl border border-ink-200 bg-white"
          >
            <Stage value={data.ready_documents} label="Documents" detail={`${data.total_documents - data.ready_documents} still processing`} />
            <Stage value={pages} label="Pages read" detail="Text extracted page by page" />
            <Stage value={data.total_chunks} label="Passages" detail="About 200 tokens each, never across pages" />
            <Stage value={data.index_vectors} label="Searchable" detail="By meaning (FAISS) and by keyword (BM25)" />
            <Stage value={data.total_questions} label="Questions asked" detail="Each answer cites its passages" last />
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-ink-900">Try a workflow</h2>
            <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 lg:grid-cols-4">
              {workflows.map((w) => (
                <Link key={w.title} to={w.to} className="group rounded-xl px-1 py-3 hover:bg-white">
                  <div className="flex items-start gap-2 px-2">
                    <w.icon className="mt-0.5 h-5 w-5 shrink-0 text-signal-600" />
                    <span className="font-semibold text-ink-900 group-hover:text-signal-700">{w.title}</span>
                  </div>
                  <p className="mt-1 px-2 text-sm leading-snug text-ink-600">{w.body}</p>
                </Link>
              ))}
            </div>
          </section>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.25fr_1fr]">
            <section>
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-ink-900">Recent questions</h2>
                <Link to="/assistant" className="text-sm font-medium text-signal-700 hover:underline">
                  Open the assistant
                </Link>
              </div>
              {data.recent_questions.length === 0 ? (
                <p className="mt-3 text-sm text-ink-500">No questions yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white">
                  {data.recent_questions.map((q, i) => (
                    <li key={`${q.asked_at}-${i}`} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] text-ink-900">{q.question}</p>
                        <p className="text-xs text-ink-500">{formatDate(q.asked_at)}</p>
                      </div>
                      {q.answer_mode && (
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${OUTCOME[q.answer_mode].className}`}>
                          {OUTCOME[q.answer_mode].label}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-ink-900">What’s indexed</h2>
                <StatusBadge status={data.kb_status} />
              </div>
              <ul className="mt-3 space-y-3 rounded-2xl border border-ink-200 bg-white px-5 py-4">
                {documents.map((d) => (
                  <li key={d.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-ink-900">{shortName(d.filename)}</span>
                      <span className="shrink-0 text-xs text-ink-500">
                        {d.status === 'ready' ? `${d.page_count ?? 0} pages, ${d.chunk_count} passages` : 'Indexing…'}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-signal-500 transition-[width] duration-500"
                        style={{ width: d.status === 'ready' ? `${(d.chunk_count / maxChunks) * 100}%` : '8%' }}
                      />
                    </div>
                  </li>
                ))}
                {documents.length === 0 && <li className="text-sm text-ink-500">Nothing indexed yet.</li>}
              </ul>

              <div className="mt-6 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-ink-900">Right page ranked first</h2>
                <Link to="/evaluation" className="text-sm font-medium text-signal-700 hover:underline">
                  Details
                </Link>
              </div>
              <ul className="mt-3 space-y-2 rounded-2xl border border-ink-200 bg-white px-5 py-4">
                {EVAL_MODES.map((m) => {
                  const v = metrics(EVAL_ROWS, m).hit1
                  return (
                    <li key={m} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                      <span className="text-ink-700">{MODE_LABEL[m]}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-ink-100">
                        <span className="block h-full rounded-full" style={{ width: `${v * 100}%`, background: MODE_COLOR[m] }} />
                      </span>
                      <span className="text-right font-medium text-ink-900">{Math.round(v * 100)}%</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
