import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MODE_COLOR, MODE_LABEL } from '../components/modeStyles'
import { EVAL_MODES, EVAL_ROWS, metrics } from '../demo/evaluation'
import type { RetrievalMode } from '../types'

type Filter = 'all' | 'paraphrase' | 'identifier'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All 30 questions' },
  { value: 'paraphrase', label: 'Paraphrased' },
  { value: 'identifier', label: 'Policy IDs' },
]

const pct = (v: number) => `${Math.round(v * 100)}%`

function RankChip({ rank, mode }: { rank: number | null; mode: RetrievalMode }) {
  if (rank === null) return <span className="text-xs text-ink-400">missed</span>
  const first = rank === 1
  return (
    <span
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold ${first ? 'text-white' : 'bg-ink-100 text-ink-700'}`}
      style={first ? { background: MODE_COLOR[mode] } : undefined}
    >
      #{rank}
    </span>
  )
}

export function Evaluation() {
  const [filter, setFilter] = useState<Filter>('all')
  const rows = filter === 'all' ? EVAL_ROWS : EVAL_ROWS.filter((r) => r.type === filter)
  const byMode = Object.fromEntries(EVAL_MODES.map((m) => [m, metrics(rows, m)])) as Record<RetrievalMode, ReturnType<typeof metrics>>

  const chart = [
    { metric: 'Right page first', ...Object.fromEntries(EVAL_MODES.map((m) => [m, byMode[m].hit1])) },
    { metric: 'Right page in top 5', ...Object.fromEntries(EVAL_MODES.map((m) => [m, byMode[m].hit5])) },
    { metric: 'Mean reciprocal rank', ...Object.fromEntries(EVAL_MODES.map((m) => [m, byMode[m].mrr])) },
  ]

  return (
    <div className="mx-auto max-w-6xl px-10 py-10">
      <header className="max-w-3xl">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink-900">Search quality</h1>
        <p className="mt-1.5 text-ink-600">
          Thirty test questions over the four sample policies, each with the page that answers it. A hit means that page is
          among the passages search returns. Measured with <code className="rounded bg-ink-100 px-1 text-[13px]">python -m eval.run_eval</code>.
        </p>
      </header>

      <div className="mt-6 flex gap-1 rounded-lg bg-ink-100 p-0.5 text-sm" role="radiogroup" aria-label="Question type">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="radio"
            aria-checked={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-md px-3 py-1.5 font-medium ${filter === f.value ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section data-tour="eval-summary" className="mt-5 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-2xl border border-ink-200 bg-white px-5 pt-5 pb-2">
          <ul className="flex gap-5 text-sm text-ink-700" aria-label="Legend">
            {EVAL_MODES.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MODE_COLOR[m] }} />
                {MODE_LABEL[m]}
              </li>
            ))}
          </ul>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 22, right: 8, bottom: 0, left: -18 }} barGap={2} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke="#ecebf2" />
                <XAxis dataKey="metric" tick={{ fontSize: 13, fill: '#54506f' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 1]} tickFormatter={pct} tick={{ fontSize: 12, fill: '#8a869b' }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#f6f5fa' }}
                  formatter={(value, name) => [typeof value === 'number' ? value.toFixed(3) : String(value), MODE_LABEL[name as RetrievalMode]]}
                />
                {EVAL_MODES.map((m) => (
                  <Bar key={m} dataKey={m} fill={MODE_COLOR[m]} radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
                    {m === 'hybrid' && (
                      <LabelList dataKey={m} position="top" formatter={(v) => (typeof v === 'number' ? v.toFixed(2) : '')} style={{ fontSize: 12, fill: '#16223a', fontWeight: 600 }} />
                    )}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white px-5 py-5">
          <h2 className="font-semibold text-ink-900">What the numbers say</h2>
          <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink-600">
            <li>
              Semantic search handles paraphrases: it ranks the right page first for{' '}
              {pct(metrics(EVAL_ROWS.filter((r) => r.type === 'paraphrase'), 'semantic').hit1)} of them.
            </li>
            <li>
              Keyword search wins on policy IDs like SEC-117, where semantic search manages only{' '}
              {pct(metrics(EVAL_ROWS.filter((r) => r.type === 'identifier'), 'semantic').hit1)}.
            </li>
            <li>
              Hybrid combines both and has the best overall result: {pct(metrics(EVAL_ROWS, 'hybrid').hit1)} first,{' '}
              {pct(metrics(EVAL_ROWS, 'hybrid').hit5)} in the top 5.
            </li>
            <li className="text-ink-500">The sample corpus is small, so treat this as a sanity check rather than a benchmark.</li>
          </ul>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-900">Question by question</h2>
        <p className="text-sm text-ink-500">Rank of the expected page in each mode’s top 5. Click a question to ask it.</p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-ink-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-medium text-ink-500">
              <tr>
                <th className="px-4 py-2.5">Question</th>
                <th className="px-4 py-2.5">Expected page</th>
                {EVAL_MODES.map((m) => (
                  <th key={m} className="px-3 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: MODE_COLOR[m] }} />
                      {MODE_LABEL[m]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-ink-50/60">
                  <td className="max-w-md px-4 py-2.5">
                    <Link
                      to={`/assistant?ask=${encodeURIComponent(r.question)}`}
                      className="text-ink-900 hover:text-signal-700 hover:underline"
                    >
                      {r.question}
                    </Link>
                    {r.type === 'identifier' && <span className="ml-2 text-xs text-ink-400">policy ID</span>}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-ink-600">
                    {r.document.replace(/\.pdf$/, '').replace(/_/g, ' ')}, p.{r.page}
                  </td>
                  {EVAL_MODES.map((m) => (
                    <td key={m} className="px-3 py-2.5 text-center">
                      <RankChip rank={r.ranks[m]} mode={m} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
