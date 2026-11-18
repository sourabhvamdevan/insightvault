import { createContext, useContext } from 'react'

export interface TourStep {
  /** Route (with optional query) the step navigates to. Query params trigger page actions. */
  to: string
  /** data-tour attribute of the element to outline, if any. */
  target?: string
  title: string
  body: string
}

export interface TourState {
  active: boolean
  index: number
  steps: TourStep[]
  start: () => void
  next: () => void
  back: () => void
  end: () => void
}

export const TourContext = createContext<TourState | null>(null)

export function useTour(): TourState {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used inside <TourProvider>')
  return ctx
}
