import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { INGESTION_STAGES, latestIngestion } from '../demo/engine'
import { subscribeToChanges } from '../services/api'
import type { IngestionProgress, IngestionStage } from '../types'
import { CheckIcon } from './Icons'

const ORDER: IngestionStage[] = ['upload', 'parse', 'chunk', 'embed', 'index', 'ready']

/** A question worth asking about each sample once it is indexed. */
const FIRST_QUESTION: Record<string, string> = {
  'Travel_Expense_Policy.pdf': 'What is the nightly hotel cap in London?',
  'Employee_Handbook.pdf': 'How many days of annual leave do full-time employees get?',
  'Remote_Work_Policy.pdf': 'How many days per week can I work remotely?',
  'IT_Security_Policy.pdf': 'What does SEC-117 require?',
}

export function IngestionPanel() {
  const [progress, setProgress] = useState<IngestionProgress | null>(() => latestIngestion())
  useEffect(() => subscribeToChanges(() => setProgress(latestIngestion())), [])

  const current = progress ? ORDER.indexOf(progress.stage) : -1
  const finished = progress?.stage === 'ready'
  const question = progress ? FIRST_QUESTION[progress.filename] : undefined

  return (
    <section data-tour="ingestion" className="rounded-2xl border border-ink-200 bg-white px-6 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink-900">
            {progress ? (finished ? `${progress.filename} is ready` : `Indexing ${progress.filename}`) : 'What happens when you add a PDF'}
          </h2>
          <p className="mt-0.5 text-sm text-ink-500">
            {progress
              ? finished
                ? progress.searchable
                  ? `${progress.pages} pages split into ${progress.chunks} passages, now searchable by meaning and by keyword.`
                  : 'The pipeline ran, but in the browser demo only the sample PDFs are searchable.'
                : 'Each stage runs in the background while you keep working.'
              : 'Upload a file or add a sample to watch these stages run.'}
          </p>
        </div>
        {finished && progress?.searchable && question && (
          <Link
            to={`/assistant?ask=${encodeURIComponent(question)}`}
            className="rounded-lg bg-signal-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-signal-700"
          >
            Ask: “{question}”
          </Link>
        )}
      </div>
      <ol className="mt-5 grid grid-cols-5 gap-3">
        {INGESTION_STAGES.map((s, i) => {
          const state = !progress ? 'idle' : i < current ? 'done' : i === current && !finished ? 'active' : finished ? 'done' : 'pending'
          return (
            <li key={s.stage} className="min-w-0">
              <div
                className={`h-1.5 rounded-full transition-colors duration-300 ${
                  state === 'done' ? 'bg-signal-500' : state === 'active' ? 'animate-pulse bg-marker-strong' : 'bg-ink-100'
                }`}
              />
              <p className={`mt-2.5 flex items-center gap-1.5 text-sm font-medium ${state === 'pending' || state === 'idle' ? 'text-ink-500' : 'text-ink-900'}`}>
                {state === 'done' && <CheckIcon className="h-3.5 w-3.5 text-signal-600" />}
                <span className="truncate">
                  {i + 1}. {s.label}
                </span>
              </p>
              <p className="mt-0.5 text-xs leading-snug text-ink-500">
                {s.stage === 'parse' && progress?.pages ? `${progress.pages} pages with text` : s.stage === 'chunk' && progress?.chunks ? `${progress.chunks} passages` : s.detail}
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
