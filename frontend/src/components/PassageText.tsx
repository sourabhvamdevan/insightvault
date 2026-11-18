import { layoutPage, markSentences, supportingSentences } from '../utils/evidence'

interface Props {
  /** Raw PDF text of a passage or a whole page. */
  text: string
  /** Answer text that cites this passage; its supporting sentences get the highlighter. */
  support: string | null
  showHeadings?: boolean
  showFooter?: boolean
  className?: string
}

/** PDF text rendered as headings and paragraphs, with the sentences behind the answer highlighted. */
export function PassageText({ text, support, showHeadings = true, showFooter = false, className = '' }: Props) {
  const page = layoutPage(text)
  const marked = support ? supportingSentences(page.paragraphs.join(' '), support) : new Set<string>()
  return (
    <div className={className}>
      {showHeadings &&
        page.headings.map((h, i) => (
          <p key={h} className={i === page.headings.length - 1 ? 'mb-3 font-sans font-semibold text-ink-900' : 'mb-1 font-sans text-sm text-ink-500'}>
            {h}
          </p>
        ))}
      {page.paragraphs.map((para, i) => (
        <p key={i} className={i > 0 ? 'mt-3' : ''}>
          {markSentences(para, marked).map((s, j) => (
            <span key={j}>
              {s.marked ? <mark className="marker text-ink-950">{s.text}</mark> : s.text}{' '}
            </span>
          ))}
        </p>
      ))}
      {showFooter && page.footer && <p className="mt-8 font-sans text-xs text-ink-400">{page.footer}</p>}
    </div>
  )
}
