import { useEffect, useMemo } from 'react'
import { compareModes } from '../demo/engine'
import type { RetrievalMode } from '../types'
import { CloseIcon } from './Icons'
import { MODE_COLOR, MODE_DESCRIPTION, MODE_LABEL } from './modeStyles'

interface Props {
  question: string
  /** Chunks the shown answer relied on; their rank in each mode is the point of the comparison. */
  answerChunkIds: number[]
  onClose: () => void
}

const MODES: RetrievalMode[] = ['semantic', 'keyword', 'hybrid']

export function CompareModal({ question, answerChunkIds, onClose }: Props) {
  const results = useMemo(() => compareModes(question), [question])
  const wanted = new Set(answerChunkIds)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-6" role="dialog" aria-modal="true" aria-label="Compare search modes">
      <div data-tour="compare" className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start gap-3 border-b border-ink-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-ink-900">Same question, three ways to search</h2>
            <p className="mt-0.5 text-sm text-ink-500">“{question}”</p>
            {wanted.size > 0 && (
              <p className="mt-2 text-sm text-ink-600">
                <mark className="marker">Highlighted</mark> rows are the passages the answer cites.
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        <div className="grid flex-1 grid-cols-3 divide-x divide-ink-100 overflow-y-auto">
          {MODES.map((mode) => {
            const r = results[mode]
            const firstHit = r.sources.findIndex((s) => wanted.has(s.chunk_id))
            return (
              <section key={mode} className="flex flex-col px-5 py-5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: MODE_COLOR[mode] }} />
                  <h3 className="font-semibold text-ink-900">{MODE_LABEL[mode]}</h3>
                </div>
                <p className="mt-1 text-xs text-ink-500">{MODE_DESCRIPTION[mode]}</p>
                {wanted.size > 0 && (
                  <p className={`mt-3 text-sm font-medium ${firstHit >= 0 ? 'text-ink-900' : 'text-ink-500'}`}>
                    {firstHit >= 0 ? `Answer passage ranked #${firstHit + 1}` : 'Answer passage not in the top 5'}
                  </p>
                )}
                {r.custom && mode === 'semantic' && (
                  <p className="mt-2 text-xs text-ink-500">Custom question: the demo has no recorded semantic results, so this shows keyword results.</p>
                )}
                <ol className="mt-3 space-y-2">
                  {r.sources.map((s) => {
                    const hit = wanted.has(s.chunk_id)
                    const score = mode === 'keyword' ? s.bm25_score : mode === 'semantic' ? s.semantic_score : s.rrf_score
                    return (
                      <li
                        key={s.chunk_id}
                        className={`rounded-lg px-3 py-2 text-sm ${hit ? 'bg-marker text-ink-950' : 'bg-ink-50 text-ink-700'}`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium">
                            #{s.ref} {s.document_name.replace(/\.pdf$/, '').replace(/_/g, ' ')}
                          </span>
                          <span className="shrink-0 text-xs opacity-70">{score === null ? '–' : score.toFixed(mode === 'hybrid' ? 4 : 2)}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs opacity-75">
                          p.{s.page} · {s.content.split('\n')[0]}
                        </p>
                      </li>
                    )
                  })}
                  {r.sources.length === 0 && <li className="text-sm text-ink-500">No passages matched.</li>}
                </ol>
                {!r.passed && (
                  <p className="mt-3 text-xs text-ink-500">Below the relevance threshold: this mode would reply that the documents do not cover it.</p>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
