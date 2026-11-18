import { useEffect, useState } from 'react'
import type { RetrievalMode } from '../types'
import { CheckIcon } from './Icons'

const STEPS: { label: string; skip?: RetrievalMode }[] = [
  { label: 'Searching passages by meaning', skip: 'keyword' },
  { label: 'Searching passages by keyword', skip: 'semantic' },
  { label: 'Fusing the two rankings' },
  { label: 'Checking the passages are relevant' },
  { label: 'Writing the answer with citations' },
]

const STEP_MS = 420

/** Live progress while the assistant works: the one orchestrated motion in the app. */
export function RetrievalProgress({ mode }: { mode: RetrievalMode }) {
  const steps = STEPS.filter((s) => s.skip !== mode)
  const [done, setDone] = useState(0)

  useEffect(() => {
    if (done >= steps.length - 1) return
    const t = window.setTimeout(() => setDone((d) => d + 1), STEP_MS)
    return () => window.clearTimeout(t)
  }, [done, steps.length])

  return (
    <div data-tour="answer" className="max-w-md rounded-2xl rounded-bl-sm border border-ink-200 bg-white px-5 py-4" role="status" aria-live="polite">
      <ol className="space-y-2">
        {steps.map((s, i) => {
          const state = i < done ? 'done' : i === done ? 'active' : 'pending'
          return (
            <li key={s.label} className={`flex items-center gap-2.5 text-sm ${state === 'pending' ? 'text-ink-300' : 'text-ink-800'}`}>
              <span className="flex h-4 w-4 items-center justify-center">
                {state === 'done' ? (
                  <CheckIcon className="h-4 w-4 text-signal-600" />
                ) : state === 'active' ? (
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-marker-strong" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-200" />
                )}
              </span>
              {s.label}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
