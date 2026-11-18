import { useEffect, useRef, useState } from 'react'
import { getPage } from '../demo/engine'
import { CloseIcon } from './Icons'
import { PassageText } from './PassageText'

interface Props {
  documentId: string
  documentName: string
  page: number
  /** Answer text citing a passage on this page; its supporting sentences are highlighted. */
  support: string | null
  onClose: () => void
}

export function PageViewer({ documentId, documentName, page: initialPage, support, onClose }: Props) {
  const [page, setPage] = useState(initialPage)
  const articleRef = useRef<HTMLElement>(null)
  const data = getPage(documentId, page)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    articleRef.current?.querySelector('mark')?.scrollIntoView({ block: 'center' })
  }, [page])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-6" role="dialog" aria-modal="true" aria-label={`${documentName}, page ${page}`}>
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center gap-3 border-b border-ink-100 px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink-900">{documentName}</p>
            <p className="text-sm text-ink-500">
              Page {page}
              {data ? ` of ${data.pageCount}` : ''}
              {support && page === initialPage ? ', sentences behind the answer highlighted' : ''}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-50 disabled:opacity-40"
            >
              Previous page
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data || page >= data.pageCount}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-50 disabled:opacity-40"
            >
              Next page
            </button>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        <div className="overflow-y-auto bg-ink-50 px-6 py-6">
          <article
            ref={articleRef}
            className="mx-auto min-h-[28rem] max-w-[62ch] rounded-sm bg-white px-12 py-12 font-serif text-[15.5px] leading-[1.75] text-ink-800 shadow-sm ring-1 ring-ink-100"
          >
            {data ? (
              <PassageText text={data.text} support={page === initialPage ? support : null} showFooter />
            ) : (
              <p className="text-ink-500">This page has no extractable text.</p>
            )}
          </article>
        </div>
      </div>
    </div>
  )
}
