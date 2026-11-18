import { useEffect, type ReactNode } from 'react'
import type { RetrievalTrace, TraceHit } from '../types'
import { CheckIcon, CloseIcon } from './Icons'
import { MODE_COLOR, MODE_LABEL } from './modeStyles'

function Step({ n, title, meta, children }: { n: number; title: string; meta?: string; children: ReactNode }) {
  return (
    <li className="group relative pb-7 pl-10 last:pb-0">
      <span className="absolute top-0 left-0 flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
        {n}
      </span>
      <span className="absolute top-7 bottom-0 left-[13px] w-px bg-ink-200 group-last:hidden" aria-hidden="true" />
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-ink-900">{title}</h3>
        {meta && <span className="shrink-0 text-xs text-ink-400">{meta}</span>}
      </div>
      <div className="mt-2 text-sm text-ink-600">{children}</div>
    </li>
  )
}

function Hits({ hits, color, max }: { hits: TraceHit[]; color: string; max: number }) {
  return (
    <ol className="space-y-1.5">
      {hits.slice(0, 5).map((h, i) => (
        <li key={h.chunk_id} className="grid grid-cols-[1.25rem_1fr_7rem] items-center gap-2 text-[13px]">
          <span className="text-ink-400">{i + 1}</span>
          <span className="truncate text-ink-800">
            {h.document_name.replace(/\.pdf$/, '').replace(/_/g, ' ')} <span className="text-ink-400">p.{h.page}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.max(4, (Math.max(0, h.score) / max) * 100)}%`, background: color }}
              />
            </span>
            <span className="w-10 text-right text-ink-600">{h.score.toFixed(2)}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

export function TraceDrawer({ trace, onClose }: { trace: RetrievalTrace; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const t = trace.timings_ms
  const total = t.embed + t.semantic + t.keyword + t.fuse + t.generate
  const keywordMax = Math.max(...(trace.keyword ?? []).map((h) => h.score), 1)
  const semanticSkipReason =
    trace.mode === 'keyword'
      ? 'Skipped: keyword mode uses BM25 only.'
      : 'The browser demo has recorded semantic results only for the suggested questions, so this custom question was answered from keyword search.'

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/30" role="dialog" aria-modal="true" aria-label="Retrieval trace">
      <button type="button" className="flex-1 cursor-default" onClick={onClose} aria-label="Close trace" tabIndex={-1} />
      <aside data-tour="trace" className="flex h-full w-[540px] flex-col bg-white shadow-2xl">
        <header className="flex items-start gap-3 border-b border-ink-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-ink-900">How this answer was found</h2>
            <p className="mt-0.5 truncate text-sm text-ink-500" title={trace.question}>
              “{trace.question}”
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs text-ink-500">
              <span className="h-2 w-2 rounded-full" style={{ background: MODE_COLOR[trace.mode] }} />
              {MODE_LABEL[trace.mode]} search, {total.toLocaleString()} ms in total
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        <ol className="flex-1 overflow-y-auto px-6 py-6">
          <Step n={1} title="Read the question">
            <p>Keyword search matches these terms (common words are dropped):</p>
            <p className="mt-2 flex flex-wrap gap-1.5">
              {trace.query_tokens.length ? (
                trace.query_tokens.map((tok, i) => (
                  <span key={`${tok}-${i}`} className="rounded-md bg-ink-100 px-2 py-0.5 text-[13px] text-ink-800">
                    {tok}
                  </span>
                ))
              ) : (
                <span className="text-ink-400">no searchable terms</span>
              )}
            </p>
          </Step>

          <Step n={2} title="Semantic search" meta={trace.semantic ? `${t.embed + t.semantic} ms` : undefined}>
            {trace.semantic ? (
              <>
                <p className="mb-2">The question is embedded and compared with every passage by cosine similarity.</p>
                <Hits hits={trace.semantic} color={MODE_COLOR.semantic} max={1} />
              </>
            ) : (
              <p className="text-ink-500">{semanticSkipReason}</p>
            )}
          </Step>

          <Step n={3} title="Keyword search" meta={trace.keyword ? `${t.keyword} ms` : undefined}>
            {trace.keyword ? (
              trace.keyword.length ? (
                <>
                  <p className="mb-2">BM25 scores passages that share the question's terms, rare terms counting most.</p>
                  <Hits hits={trace.keyword} color={MODE_COLOR.keyword} max={keywordMax} />
                </>
              ) : (
                <p className="text-ink-500">No passage contains any of the question's terms.</p>
              )
            ) : (
              <p className="text-ink-500">Skipped: semantic mode uses embeddings only.</p>
            )}
          </Step>

          <Step n={4} title="Fuse the rankings" meta={`${t.fuse} ms`}>
            <p className="mb-2">
              Each passage scores 1 / (60 + rank) for every list it appears in. Near-duplicates are dropped and the top 5 are
              kept.
            </p>
            {trace.fused.length ? (
              <table className="w-full text-[12.5px]">
                <thead className="text-left text-ink-400">
                  <tr>
                    <th className="py-1 font-normal">Passage</th>
                    <th className="py-1 text-right font-normal">Sem.</th>
                    <th className="py-1 text-right font-normal">Kw.</th>
                    <th className="py-1 text-right font-normal">Fused</th>
                    <th className="py-1 pl-3 font-normal">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {trace.fused.map((r) => (
                    <tr key={r.chunk_id} className={`border-t border-ink-100 ${r.selected ? 'text-ink-900' : 'text-ink-400'}`}>
                      <td className="max-w-[170px] truncate py-1.5">
                        {r.document_name.replace(/\.pdf$/, '').replace(/_/g, ' ')} p.{r.page}
                      </td>
                      <td className="py-1.5 text-right">{r.semantic_rank ? `#${r.semantic_rank}` : '–'}</td>
                      <td className="py-1.5 text-right">{r.keyword_rank ? `#${r.keyword_rank}` : '–'}</td>
                      <td className="py-1.5 text-right">{r.rrf_score.toFixed(4)}</td>
                      <td className="py-1.5 pl-3">
                        {r.selected ? (
                          <span className="inline-flex items-center gap-1 text-signal-700">
                            <CheckIcon className="h-3.5 w-3.5" /> kept
                          </span>
                        ) : (
                          r.skipped_reason
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-ink-500">Nothing to fuse: neither search returned a passage.</p>
            )}
          </Step>

          <Step n={5} title="Check relevance">
            <p>
              {trace.gate.best_semantic !== null ? (
                <>
                  Best semantic score <strong className="text-ink-900">{trace.gate.best_semantic.toFixed(2)}</strong> against a
                  threshold of {trace.gate.threshold}.
                </>
              ) : (
                <>No semantic score to compare with the {trace.gate.threshold} threshold.</>
              )}{' '}
              {trace.gate.keyword_hit ? 'At least one passage also matched on keywords.' : 'No keyword matches.'}
            </p>
            <p className={`mt-2 font-medium ${trace.gate.passed ? 'text-signal-700' : 'text-ink-900'}`}>
              {trace.gate.passed
                ? 'Passed: the passages go to the model.'
                : 'Not passed: the model is not called, and the reply says the documents do not cover this.'}
            </p>
          </Step>

          <Step n={6} title="Write the answer" meta={t.generate ? `${(t.generate / 1000).toFixed(1)} s` : undefined}>
            {trace.prompt ? (
              <p>
                The model receives {trace.prompt.sources} numbered passages ({trace.prompt.chars.toLocaleString()} characters) and
                instructions to answer only from them, cite each claim as [n], and say so when the passages do not contain the
                answer.
              </p>
            ) : (
              <p className="text-ink-500">Skipped.</p>
            )}
          </Step>
        </ol>
        <footer className="border-t border-ink-100 px-6 py-3 text-xs text-ink-400">
          Rankings and scores were recorded from the real pipeline. Timings are illustrative.
        </footer>
      </aside>
    </div>
  )
}
