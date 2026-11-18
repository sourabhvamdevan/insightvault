import { useState } from 'react'
import { resetDemo } from '../demo/engine'
import { useTour } from '../hooks/useTour'
import { PlayIcon, ResetIcon } from './Icons'

export function DemoBar() {
  const tour = useTour()
  const [confirmReset, setConfirmReset] = useState(false)

  function reset() {
    resetDemo()
    setConfirmReset(false)
    tour.end()
    // Reload so every page starts from the fresh demo state.
    window.location.assign('/')
  }

  return (
    <div className="flex items-center gap-4 border-b border-ink-200 bg-white px-6 py-2.5 text-sm">
      <span className="rounded-md bg-marker px-2 py-0.5 text-xs font-semibold text-ink-900">Demo</span>
      <p className="min-w-0 flex-1 truncate text-ink-500" title="Runs in your browser on four sample policies. Retrieval scores were recorded from the real pipeline; answers to suggested questions are pre-written from the cited passages.">
        Runs in your browser on four sample policies, replaying retrieval scores recorded from the real pipeline.
      </p>
      {confirmReset ? (
        <span className="flex items-center gap-2 text-ink-700">
          Clear uploads and chats?
          <button type="button" onClick={reset} className="font-semibold text-signal-700 hover:underline">
            Reset
          </button>
          <button type="button" onClick={() => setConfirmReset(false)} className="text-ink-500 hover:underline">
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          className="flex items-center gap-1.5 text-ink-500 hover:text-ink-900"
        >
          <ResetIcon className="h-4 w-4" /> Reset demo
        </button>
      )}
      {!tour.active && (
        <button
          type="button"
          onClick={tour.start}
          className="flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-1.5 font-medium text-white hover:bg-ink-800"
        >
          <PlayIcon className="h-3.5 w-3.5" /> Take the tour
        </button>
      )}
    </div>
  )
}
