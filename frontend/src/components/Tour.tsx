import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { TourContext, useTour, type TourState, type TourStep } from '../hooks/useTour'

const STEPS: TourStep[] = [
  {
    to: '/',
    target: 'pipeline',
    title: 'A knowledge base you can audit',
    body: 'Policies and handbooks go in as PDFs. Every answer that comes out cites the page and passage it came from. These counts are the live state of the demo.',
  },
  {
    to: '/knowledge-base?add=Travel_Expense_Policy.pdf',
    target: 'ingestion',
    title: 'Add a document',
    body: 'The Travel and Expense Policy is being indexed now: text is extracted page by page, split into passages, embedded, and added to both search indexes.',
  },
  {
    to: '/assistant?ask=What is the nightly hotel cap in London?',
    target: 'answer',
    title: 'Ask in your own words',
    body: 'The question never says “TE-310” or “per diem”, yet the answer comes from the policy that was just added.',
  },
  {
    to: '/assistant',
    target: 'sources',
    title: 'Check the evidence',
    body: 'Each number in the answer is a citation. Click one to jump to its passage, then open the page to see the passage highlighted where it sits.',
  },
  {
    to: '/assistant?panel=trace',
    target: 'trace',
    title: 'See how the answer was found',
    body: 'The trace shows both searches, how their rankings were fused, and the relevance check that runs before the model is asked anything.',
  },
  {
    to: "/assistant?ask=When do I need a doctor's note for being ill?",
    target: 'answer',
    title: 'Paraphrases are hard for keywords',
    body: 'Nothing in this question matches the words “medical certificate”. The right passage still reaches the answer because semantic search ranks it first.',
  },
  {
    to: '/assistant?panel=compare',
    target: 'compare',
    title: 'Compare the three search modes',
    body: 'Semantic search finds the sick-leave passage first, keyword search misses it entirely, and hybrid keeps it in the top five.',
  },
  {
    to: '/assistant?ask=What is the recipe for banana bread?',
    target: 'answer',
    title: 'No answer beats a made-up one',
    body: 'Nothing in the documents is relevant, so the model is never called and the reply says the answer is not in the documents.',
  },
  {
    to: '/evaluation',
    target: 'eval-summary',
    title: 'Measured, not assumed',
    body: 'Thirty test questions with known answer pages. Hybrid search puts the right page first more often than either search alone.',
  },
]

export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)

  const go = useCallback(
    (i: number) => {
      setIndex(i)
      navigate(STEPS[i].to)
    },
    [navigate],
  )

  const value = useMemo<TourState>(
    () => ({
      active,
      index,
      steps: STEPS,
      start: () => {
        setActive(true)
        go(0)
      },
      next: () => {
        if (index + 1 < STEPS.length) go(index + 1)
        else setActive(false)
      },
      back: () => {
        if (index > 0) go(index - 1)
      },
      end: () => setActive(false),
    }),
    [active, index, go],
  )

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && <TourOverlay />}
    </TourContext.Provider>
  )
}

function findTarget(name: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)
  return all.length ? all[all.length - 1] : null
}

function TourOverlay() {
  const tour = useTour()
  const step = tour.steps[tour.index]
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!step.target) {
      setRect(null)
      return
    }
    let frame = 0
    let scrolled = false
    const update = () => {
      const el = findTarget(step.target as string)
      if (el) {
        if (!scrolled) {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          scrolled = true
        }
        setRect(el.getBoundingClientRect())
      } else setRect(null)
      frame = window.requestAnimationFrame(update)
    }
    update()
    return () => window.cancelAnimationFrame(frame)
  }, [step.target, tour.index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) tour.end()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tour])

  const last = tour.index === tour.steps.length - 1
  // Keep the card clear of panels that open on the right (trace drawer, comparison).
  const placeLeft = rect !== null && rect.right > window.innerWidth - 380 && rect.bottom > window.innerHeight - 300
  return (
    <>
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-40 rounded-xl ring-4 ring-marker-strong/80 transition-all duration-300"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      <div
        role="dialog"
        aria-label="Guided tour"
        className={`fixed bottom-6 z-[60] w-[360px] rounded-2xl bg-ink-900 p-5 text-white shadow-2xl shadow-ink-950/30 ${placeLeft ? 'left-6' : 'right-6'}`}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-ink-300">
            Step {tour.index + 1} of {tour.steps.length}
          </p>
          <button
            type="button"
            onClick={tour.end}
            className="rounded px-1.5 text-lg leading-none text-ink-300 hover:text-white"
            aria-label="End tour"
          >
            ×
          </button>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {tour.steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= tour.index ? 'bg-marker-strong' : 'bg-ink-700'}`}
            />
          ))}
        </div>
        <h2 className="mt-4 text-lg font-semibold">{step.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-200">{step.body}</p>
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={tour.back}
            disabled={tour.index === 0}
            className="rounded-lg px-3 py-1.5 text-sm text-ink-200 hover:text-white disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={tour.next}
            className="rounded-lg bg-marker-strong px-4 py-1.5 text-sm font-semibold text-ink-950 hover:bg-marker"
          >
            {last ? 'Finish tour' : 'Next'}
          </button>
        </div>
      </div>
    </>
  )
}
