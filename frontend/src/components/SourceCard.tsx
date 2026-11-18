import type { SourceOut } from '../types'
import { layoutPage } from '../utils/evidence'
import { formatScore } from '../utils/format'
import { ChevronIcon, PageIcon } from './Icons'
import { PassageText } from './PassageText'

interface Props {
  source: SourceOut
  anchorId: string
  expanded: boolean
  highlighted: boolean
  onToggle: () => void
  onOpenPage?: () => void
  /** Answer sentences that cite this source. */
  support?: string | null
}

function Score({ label, value, digits = 2 }: { label: string; value: number | null; digits?: number }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-ink-400">{label}</span> <span className="text-ink-600">{formatScore(value, digits)}</span>
    </span>
  )
}

export function SourceCard({ source, anchorId, expanded, highlighted, onToggle, onOpenPage, support = null }: Props) {
  const layout = layoutPage(source.content)
  const section = layout.headings[layout.headings.length - 1]
  return (
    <div
      id={anchorId}
      className={`scroll-mt-24 rounded-xl border bg-white transition-shadow ${
        highlighted ? 'border-marker-strong shadow-[0_0_0_3px_var(--color-marker)]' : 'border-ink-200'
      }`}
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        <span
          className={`mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-semibold ${
            source.cited ? 'bg-marker text-ink-950' : 'bg-ink-100 text-ink-600'
          }`}
        >
          {source.ref}
        </span>
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate text-sm font-semibold text-ink-900">{source.document_name}</span>
            <span className="text-sm text-ink-500">page {source.page}</span>
            <span className={`text-xs ${source.cited ? 'font-medium text-ink-900' : 'text-ink-400'}`}>
              {source.cited ? 'cited in the answer' : 'retrieved, not cited'}
            </span>
          </div>
          {section && <p className="mt-0.5 text-[13px] text-ink-600">{section}</p>}
          {!expanded && (
            <p className="mt-1 line-clamp-2 font-serif text-[13.5px] leading-snug text-ink-500">{layout.paragraphs.join(' ')}</p>
          )}
          <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11.5px]">
            <Score label="semantic" value={source.semantic_score} />
            <Score label="keyword" value={source.bm25_score} />
            <Score label="fused" value={source.rrf_score} digits={4} />
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {onOpenPage && (
            <button
              type="button"
              onClick={onOpenPage}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-signal-700 hover:bg-signal-50"
            >
              <PageIcon className="h-3.5 w-3.5" /> Open page
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? 'Collapse passage' : 'Expand passage'}
            className="rounded-md p-1 text-ink-400 hover:bg-ink-50"
          >
            <ChevronIcon className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-ink-100 px-4 py-4 pl-[3.25rem]">
          <PassageText
            text={source.content}
            support={source.cited ? support : null}
            showHeadings={false}
            className="font-serif text-[15px] leading-relaxed text-ink-800"
          />
        </div>
      )}
    </div>
  )
}
