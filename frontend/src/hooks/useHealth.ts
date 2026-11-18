import { useCallback, useEffect, useState } from 'react'
import { ApiError, getHealth, subscribeToChanges } from '../services/api'
import type { HealthResponse } from '../types'

export interface HealthState {
  health: HealthResponse | null
  error: ApiError | null
  loading: boolean
  refresh: () => Promise<void>
}

export function useHealth(): HealthState {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setHealth(await getHealth())
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err : null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => subscribeToChanges(() => void refresh()), [refresh])

  return { health, error, loading, refresh }
}
