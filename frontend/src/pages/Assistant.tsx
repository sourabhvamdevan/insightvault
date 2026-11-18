import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { type AssistantItem, ChatMessage } from '../components/ChatMessage'
import { CompareModal } from '../components/CompareModal'
import { ErrorBanner } from '../components/ErrorBanner'
import { PlusIcon, SendIcon } from '../components/Icons'
import { MODE_COLOR, MODE_DESCRIPTION, MODE_LABEL } from '../components/modeStyles'
import { PageViewer } from '../components/PageViewer'
import { RetrievalProgress } from '../components/RetrievalProgress'
import { TraceDrawer } from '../components/TraceDrawer'
import { curatedQuestions } from '../demo/engine'
import { useChat } from '../hooks/useChat'
import { DEMO_MODE } from '../services/api'
import type { RetrievalMode, RetrievalTrace, SourceOut } from '../types'

const GENERIC_SUGGESTIONS = [
  'What are the main policies described in these documents?',
  'How many days of annual leave do employees get?',
  'What is the process for reporting a security incident?',
  'Summarize the remote work rules.',
]

const SUGGESTION_GROUPS: { group: string; title: string; hint: string }[] = [
  { group: 'Paraphrased question', title: 'Ask in your own words', hint: 'Semantic search finds the meaning' },
  { group: 'Exact policy ID', title: 'Look up a policy by its ID', hint: 'Keyword search catches exact codes' },
  { group: 'Not in the documents', title: 'Ask what the documents don’t cover', hint: 'It says so instead of guessing' },
]

const MODES: RetrievalMode[] = ['hybrid', 'semantic', 'keyword']
const MAX_QUESTION = 1000

type Panel =
  | { kind: 'trace'; trace: RetrievalTrace }
  | { kind: 'compare'; question: string; chunkIds: number[] }
  | { kind: 'page'; source: SourceOut; support: string | null }
  | null

export function Assistant() {
  const chat = useChat()
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState<RetrievalMode>('hybrid')
  const [panel, setPanel] = useState<Panel>(null)
  const [params, setParams] = useSearchParams()
  const bottom = useRef<HTMLDivElement>(null)
  const handledParams = useRef<string>('')

  const lastAssistant = [...chat.items].reverse().find((i): i is AssistantItem => i.kind === 'assistant') ?? null

  function submit(text: string, withMode: RetrievalMode = mode) {
    const q = text.trim()
    if (!q || chat.sending) return
    setQuestion('')
    void chat.send(q, withMode)
  }

  function openCompare(item: AssistantItem) {
    setPanel({ kind: 'compare', question: item.question, chunkIds: item.sources.filter((s) => s.cited).map((s) => s.chunk_id) })
  }

  // Query parameters let the tour and overview drive this page: ?ask=…&mode=…, ?panel=trace|compare.
  const { send, sending } = chat
  useEffect(() => {
    const key = params.toString()
    if (!key || key === handledParams.current) return
    const ask = params.get('ask')
    const wantedPanel = params.get('panel')
    if (ask) {
      if (sending) return
      handledParams.current = key
      const m = params.get('mode')
      const askMode: RetrievalMode = m === 'semantic' || m === 'keyword' ? m : 'hybrid'
      setMode(askMode)
      setPanel(null)
      setQuestion('')
      void send(ask, askMode)
      setParams({}, { replace: true })
    } else if (wantedPanel && lastAssistant) {
      if (sending) return // open the panel for the answer that is still on its way
      handledParams.current = key
      if (wantedPanel === 'trace' && lastAssistant.trace) setPanel({ kind: 'trace', trace: lastAssistant.trace })
      if (wantedPanel === 'compare' && DEMO_MODE) {
        setPanel({
          kind: 'compare',
          question: lastAssistant.question,
          chunkIds: lastAssistant.sources.filter((src) => src.cited).map((src) => src.chunk_id),
        })
      }
      setParams({}, { replace: true })
    }
  }, [params, setParams, send, sending, lastAssistant])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat.items.length, chat.sending])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    submit(question)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(question)
    }
  }

  const empty = chat.items.length === 0 && !chat.loadingThread && !chat.sending
  const curated = DEMO_MODE ? curatedQuestions() : []
  const followUp =
    DEMO_MODE && lastAssistant && !chat.sending
      ? curated.find((q) => q.group === 'Follow-up' && lastAssistant.question.toLowerCase().includes('remote'))
      : undefined

  return (
    <div className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-ink-200 bg-white">
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              chat.newChat()
              setPanel(null)
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50"
          >
            <PlusIcon className="h-4 w-4" /> New conversation
          </button>
        </div>
        <p className="px-4 pt-2 pb-1 text-xs font-medium text-ink-400">History</p>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {chat.conversationsError && <p className="px-2 text-xs text-red-600">Could not load conversations.</p>}
          {chat.conversations.length === 0 && !chat.conversationsError && (
            <p className="px-2 text-xs text-ink-400">Your questions will appear here.</p>
          )}
          <ul className="space-y-0.5">
            {chat.conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPanel(null)
                    void chat.openConversation(c.id)
                  }}
                  disabled={chat.sending}
                  className={`w-full truncate rounded-md px-2.5 py-2 text-left text-sm ${
                    c.id === chat.activeId ? 'bg-ink-100 font-medium text-ink-900' : 'text-ink-600 hover:bg-ink-50'
                  }`}
                  title={c.title}
                >
                  {c.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-8 py-8" data-tour="thread">
            {chat.threadError && <ErrorBanner title="Could not load this conversation" message={chat.threadError.message} />}
            {chat.loadingThread && <p className="text-sm text-ink-500">Loading conversation…</p>}

            {empty && (
              <div className="pt-4">
                <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-ink-900">Ask the documents</h1>
                <p className="mt-2 max-w-xl text-ink-600">
                  Answers come only from the indexed PDFs, and every claim links to the passage and page it came from.
                </p>
                {DEMO_MODE ? (
                  <div className="mt-8 grid gap-6 sm:grid-cols-3">
                    {SUGGESTION_GROUPS.map((g) => (
                      <div key={g.group}>
                        <h2 className="font-semibold text-ink-900">{g.title}</h2>
                        <p className="text-xs text-ink-500">{g.hint}</p>
                        <ul className="mt-3 space-y-1.5">
                          {curated
                            .filter((q) => q.group === g.group)
                            .slice(0, g.group === 'Paraphrased question' ? 5 : 3)
                            .map((q) => (
                              <li key={q.key}>
                                <button
                                  type="button"
                                  onClick={() => submit(q.question)}
                                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-left text-sm text-ink-800 hover:border-signal-500 hover:bg-signal-50"
                                >
                                  {q.question}
                                </button>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {GENERIC_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => submit(s)}
                        className="rounded-lg border border-ink-200 bg-white px-4 py-3 text-left text-sm text-ink-800 hover:border-signal-500"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-7">
              {chat.items.map((item) => (
                <ChatMessage
                  key={item.id}
                  item={item}
                  onOpenTrace={(i) => i.trace && setPanel({ kind: 'trace', trace: i.trace })}
                  onCompare={DEMO_MODE ? openCompare : undefined}
                  onOpenPage={DEMO_MODE ? (source, support) => setPanel({ kind: 'page', source, support }) : undefined}
                />
              ))}
              {chat.sending && <RetrievalProgress mode={mode} />}
              {followUp && (
                <button
                  type="button"
                  onClick={() => submit(followUp.question)}
                  className="rounded-full border border-dashed border-ink-300 px-3.5 py-1.5 text-sm text-ink-700 hover:border-signal-500 hover:text-signal-700"
                >
                  Follow up: {followUp.question}
                </button>
              )}
            </div>
            <div ref={bottom} />
          </div>
        </div>

        <div className="border-t border-ink-200 bg-white px-8 py-4">
          <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-xl border border-ink-300 bg-white p-2 focus-within:border-signal-500 focus-within:ring-2 focus-within:ring-signal-100">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
                onKeyDown={onKeyDown}
                disabled={chat.sending}
                rows={1}
                placeholder="Ask about leave, remote work, security or travel…"
                className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-ink-400 disabled:opacity-60"
                aria-label="Question"
              />
              <button
                type="submit"
                disabled={chat.sending || question.trim().length === 0}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-signal-600 text-white hover:bg-signal-700 disabled:cursor-not-allowed disabled:bg-ink-200"
                aria-label="Send question"
              >
                <SendIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1 rounded-lg bg-ink-100 p-0.5" role="radiogroup" aria-label="Search mode">
                {MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    title={MODE_DESCRIPTION[m]}
                    onClick={() => setMode(m)}
                    disabled={chat.sending}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium ${
                      mode === m ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: MODE_COLOR[m] }} />
                    {MODE_LABEL[m]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-400">{MODE_DESCRIPTION[mode]}</p>
            </div>
          </form>
        </div>
      </section>

      {panel?.kind === 'trace' && <TraceDrawer trace={panel.trace} onClose={() => setPanel(null)} />}
      {panel?.kind === 'compare' && (
        <CompareModal question={panel.question} answerChunkIds={panel.chunkIds} onClose={() => setPanel(null)} />
      )}
      {panel?.kind === 'page' && (
        <PageViewer
          documentId={panel.source.document_id}
          documentName={panel.source.document_name}
          page={panel.source.page}
          support={panel.support}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  )
}
