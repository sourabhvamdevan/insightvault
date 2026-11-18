import { useEffect, useState, type ReactNode } from 'react'
import type { ChatItem } from '../hooks/useChat'
import type { SourceOut } from '../types'
import { supportByRef } from '../utils/evidence'
import { ChevronIcon, LayersIcon, SearchIcon } from './Icons'
import { MODE_COLOR, MODE_LABEL } from './modeStyles'
import { SourceCard } from './SourceCard'

const ERROR_TITLES: Record<string, string> = {
  llm_unavailable: 'The local language model is not reachable',
  model_not_found: 'The language model is not installed',
  llm_timeout: 'The language model timed out',
  network_error: 'Cannot reach the API',
}

interface Focus {
  ref: number
  tick: number
}

export type AssistantItem = Extract<ChatItem, { kind: 'assistant' }>

interface SourceListProps {
  messageId: string
  sources: SourceOut[]
  label: string
  open: boolean
  expanded: Set<number>
  focus: Focus | null
  onToggleOpen: () => void
  onToggleSource: (ref: number) => void
  onOpenPage?: (source: SourceOut, support: string | null) => void
  support?: Map<number, string>
}

function SourceList(props: SourceListProps) {
  const { messageId, sources, label, open, expanded, focus, onToggleOpen, onToggleSource, onOpenPage, support } = props
  useEffect(() => {
    if (!focus) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`src-${messageId}-${focus.ref}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [focus, messageId])

  const cited = sources.filter((s) => s.cited).length
  return (
    <div className="mt-4" data-tour="sources">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
      >
        <ChevronIcon className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
        {label}: {sources.length} passages{cited > 0 ? `, ${cited} cited` : ''}
      </button>
      {open && (
        <div className="mt-2.5 space-y-2">
          {sources.map((s) => (
            <SourceCard
              key={s.ref}
              source={s}
              anchorId={`src-${messageId}-${s.ref}`}
              expanded={expanded.has(s.ref)}
              highlighted={focus?.ref === s.ref}
              onToggle={() => onToggleSource(s.ref)}
              support={support?.get(s.ref) ?? null}
              onOpenPage={onOpenPage ? () => onOpenPage(s, support?.get(s.ref) ?? null) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function useSourceListState(defaultOpen: boolean) {
  const [open, setOpen] = useState(defaultOpen)
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set())
  const [focus, setFocus] = useState<Focus | null>(null)
  return {
    open,
    expanded,
    focus,
    toggleOpen: () => setOpen((o) => !o),
    toggleSource: (ref: number) =>
      setExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(ref)) next.delete(ref)
        else next.add(ref)
        return next
      }),
    cite: (ref: number) => {
      setOpen(true)
      setExpanded((prev) => new Set(prev).add(ref))
      setFocus((prev) => ({ ref, tick: (prev?.tick ?? 0) + 1 }))
    },
  }
}

/** Render [n] markers as highlighter chips that jump to the matching source. */
function AnswerText({ text, sources, onCite }: { text: string; sources: SourceOut[]; onCite: (ref: number) => void }) {
  const refs = new Set(sources.map((s) => s.ref))
  const lines = text.split('\n')
  const renderLine = (line: string, li: number): ReactNode[] =>
    line.split(/(\[\d+\])/g).map((part, i) => {
      const m = /^\[(\d+)\]$/.exec(part)
      if (m && refs.has(Number(m[1]))) {
        const ref = Number(m[1])
        return (
          <button
            key={`${li}-${i}`}
            type="button"
            onClick={() => onCite(ref)}
            className="mx-0.5 inline-flex h-[1.15rem] min-w-[1.15rem] -translate-y-px items-center justify-center rounded bg-marker px-1 align-middle text-[11px] font-semibold text-ink-950 hover:bg-marker-strong"
            aria-label={`Show source ${ref}`}
          >
            {ref}
          </button>
        )
      }
      return <span key={`${li}-${i}`}>{part}</span>
    })
  return (
    <div className="space-y-1.5 text-[15.5px] leading-relaxed text-ink-900">
      {lines.map((line, li) =>
        line.startsWith('- ') ? (
          <p key={li} className="flex gap-2 pl-1">
            <span className="text-ink-400">•</span>
            <span>{renderLine(line.slice(2), li)}</span>
          </p>
        ) : (
          <p key={li}>{renderLine(line, li)}</p>
        ),
      )}
    </div>
  )
}

interface Props {
  item: ChatItem
  onOpenTrace?: (item: AssistantItem) => void
  onCompare?: (item: AssistantItem) => void
  onOpenPage?: (source: SourceOut, support: string | null) => void
}

export function ChatMessage({ item, onOpenTrace, onCompare, onOpenPage }: Props) {
  const list = useSourceListState(item.kind === 'error' || (item.kind === 'assistant' && item.answerMode === 'retrieval_only'))

  if (item.kind === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-ink-900 px-4 py-2.5 text-[15px] whitespace-pre-wrap text-white">
          {item.content}
        </div>
      </div>
    )
  }

  if (item.kind === 'error') {
    return (
      <div className="max-w-[92%] rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="font-semibold text-amber-900">{ERROR_TITLES[item.code] ?? 'The request failed'}</p>
        <p className="mt-1 text-sm text-amber-900/90">{item.message}</p>
        {item.sources.length > 0 && (
          <SourceList
            messageId={item.id}
            sources={item.sources}
            label="Retrieved evidence"
            open={list.open}
            expanded={list.expanded}
            focus={list.focus}
            onToggleOpen={list.toggleOpen}
            onToggleSource={list.toggleSource}
          />
        )}
      </div>
    )
  }

  const noAnswer = item.answerMode === 'no_answer'
  return (
    <div className="max-w-[92%]" data-tour="answer">
      <div className={`rounded-2xl rounded-bl-sm border px-5 py-4 ${noAnswer ? 'border-ink-200 bg-ink-100/60' : 'border-ink-200 bg-white shadow-sm'}`}>
        {item.answerMode === 'retrieval_only' && (
          <p className="mb-3 rounded-lg bg-signal-50 px-3 py-2 text-sm text-signal-700">
            Showing retrieved evidence only. Live answer generation is unavailable.
          </p>
        )}
        {noAnswer ? (
          <div>
            <p className="text-[15.5px] text-ink-700">{item.content}</p>
            <p className="mt-1 text-sm text-ink-500">
              {item.sources.length > 0
                ? 'The passages below were the closest matches, but they do not answer the question.'
                : 'No passage was relevant enough to send to the model, so nothing was generated.'}
            </p>
          </div>
        ) : item.answerMode === 'generated' ? (
          <AnswerText text={item.content} sources={item.sources} onCite={list.cite} />
        ) : null}

        {item.sources.length > 0 && (
          <SourceList
            messageId={item.id}
            sources={item.sources}
            label={item.answerMode === 'generated' ? 'Sources' : 'Evidence'}
            open={list.open}
            expanded={list.expanded}
            focus={list.focus}
            onToggleOpen={list.toggleOpen}
            onToggleSource={list.toggleSource}
            onOpenPage={onOpenPage}
            support={item.answerMode === 'generated' ? supportByRef(item.content) : undefined}
          />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-1 text-xs text-ink-500">
        {item.retrievalMode && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: MODE_COLOR[item.retrievalMode] }} />
            {MODE_LABEL[item.retrievalMode]} search
          </span>
        )}
        {item.latencyMs !== null && <span>{(item.latencyMs / 1000).toFixed(1)} s</span>}
        {item.trace && onOpenTrace && (
          <button
            type="button"
            onClick={() => onOpenTrace(item)}
            data-tour="trace-button"
            className="flex items-center gap-1 font-medium text-signal-700 hover:underline"
          >
            <LayersIcon className="h-3.5 w-3.5" /> How this answer was found
          </button>
        )}
        {onCompare && (
          <button type="button" onClick={() => onCompare(item)} className="flex items-center gap-1 font-medium text-signal-700 hover:underline">
            <SearchIcon className="h-3.5 w-3.5" /> Compare search modes
          </button>
        )}
      </div>
    </div>
  )
}
