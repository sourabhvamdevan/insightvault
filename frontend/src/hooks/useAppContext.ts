import { useOutletContext } from 'react-router-dom'
import type { HealthState } from './useHealth'

/** Shared state provided by <Layout> to every page through the router outlet. */
export interface AppContext {
  health: HealthState
}

export function useAppContext(): AppContext {
  return useOutletContext<AppContext>()
}
