import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, getConversationMessages, listConversations, sendChat } from '../services/api'
import type { AnswerMode, ConversationOut, RetrievalMode, RetrievalTrace, SourceOut } from '../types'

export type ChatItem =
  | { kind: 'user'; id: string; content: string }
  | {
      kind: 'assistant'
      id: string
      question: string
      content: string
      answerMode: AnswerMode
      sources: SourceOut[]
      retrievalMode: RetrievalMode | null
      latencyMs: number | null
      model: string | null
      trace: RetrievalTrace | null
    }
  | { kind: 'error'; id: string; code: string; message: string; sources: SourceOut[] }

export interface ChatState {
  conversations: ConversationOut[]
  conversationsError: ApiError | null
  activeId: string | null
  items: ChatItem[]
  sending: boolean
  loadingThread: boolean
  threadError: ApiError | null
  send: (question: string, mode: RetrievalMode) => Promise<void>
  openConversation: (id: string) => Promise<void>
  newChat: () => void
}

let localId = 0
const nextId = (prefix: string): string => `${prefix}-${Date.now()}-${localId++}`

export function useChat(): ChatState {
  const [conversations, setConversations] = useState<ConversationOut[]>([])
  const [conversationsError, setConversationsError] = useState<ApiError | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [items, setItems] = useState<ChatItem[]>([])
  const [sending, setSending] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const [threadError, setThreadError] = useState<ApiError | null>(null)
  const activeRef = useRef<string | null>(null)

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await listConversations())
      setConversationsError(null)
    } catch (err) {
      if (err instanceof ApiError) setConversationsError(err)
    }
  }, [])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  const openConversation = useCallback(async (id: string) => {
    activeRef.current = id
    setActiveId(id)
    setItems([])
    setThreadError(null)
    setLoadingThread(true)
    try {
      const messages = await getConversationMessages(id)
      if (activeRef.current !== id) return
      let lastQuestion = ''
      setItems(
        messages.map((m): ChatItem => {
          if (m.role === 'user') {
            lastQuestion = m.content
            return { kind: 'user', id: `m-${m.id}`, content: m.content }
          }
          return {
            kind: 'assistant',
            id: `m-${m.id}`,
            question: lastQuestion,
            content: m.content,
            answerMode: m.answer_mode ?? 'generated',
            sources: m.sources ?? [],
            retrievalMode: m.retrieval_mode ?? null,
            latencyMs: null,
            model: null,
            trace: m.trace ?? null,
          }
        }),
      )
    } catch (err) {
      if (err instanceof ApiError && activeRef.current === id) setThreadError(err)
    } finally {
      if (activeRef.current === id) setLoadingThread(false)
    }
  }, [])

  const newChat = useCallback(() => {
    activeRef.current = null
    setActiveId(null)
    setItems([])
    setThreadError(null)
  }, [])

  const send = useCallback(
    async (question: string, mode: RetrievalMode) => {
      const trimmed = question.trim()
      if (!trimmed || sending) return
      const conversationId = activeRef.current
      setItems((prev) => [...prev, { kind: 'user', id: nextId('u'), content: trimmed }])
      setSending(true)
      try {
        const res = await sendChat({ question: trimmed, conversation_id: conversationId, retrieval_mode: mode })
        if (activeRef.current !== conversationId) return
        activeRef.current = res.conversation_id
        setActiveId(res.conversation_id)
        setItems((prev) => [
          ...prev,
          {
            kind: 'assistant',
            id: nextId('a'),
            question: trimmed,
            content: res.answer,
            answerMode: res.answer_mode,
            sources: res.sources,
            retrievalMode: res.retrieval_mode,
            latencyMs: res.latency_ms,
            model: res.model,
            trace: res.trace ?? null,
          },
        ])
        if (conversationId === null) void loadConversations()
      } catch (err) {
        if (activeRef.current !== conversationId) return
        const apiErr =
          err instanceof ApiError ? err : new ApiError(0, { code: 'unknown_error', message: 'Something went wrong.' })
        setItems((prev) => [
          ...prev,
          { kind: 'error', id: nextId('e'), code: apiErr.code, message: apiErr.message, sources: apiErr.sources },
        ])
      } finally {
        setSending(false)
      }
    },
    [sending, loadConversations],
  )

  return {
    conversations,
    conversationsError,
    activeId,
    items,
    sending,
    loadingThread,
    threadError,
    send,
    openConversation,
    newChat,
  }
}
