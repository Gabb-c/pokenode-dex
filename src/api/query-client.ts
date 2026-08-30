import { QueryClient } from '@tanstack/react-query'
import { PokenodeError } from 'pokenode-ts'
import { api, resetStats } from './client'
import { transportLog } from './transport-log'

/** A name the PokéAPI does not know. Surfaced as a 404 page, never retried. */
export function isNotFound(error: unknown): boolean {
  return PokenodeError.isPokenodeError(error) && error.status === 404
}

function isClientError(error: unknown): boolean {
  return PokenodeError.isPokenodeError(error) && error.status >= 400 && error.status < 500
}

/**
 * The React tier (L1).
 *
 * `staleTime` must stay at or below the transport TTL in `client.ts`: if Query
 * held data longer than the tier beneath it, a refetch it believed cheap would
 * find nothing cached and pay for a full round trip.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: (failureCount, error) => failureCount < 2 && !isClientError(error),
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Both tiers, in the only order that works.
 *
 * Dropping Query alone would refill it from the transport cache on the next
 * render, so nothing would appear to have been cleared.
 */
export async function clearAllCaches(): Promise<void> {
  queryClient.clear()
  await api.clearCache()
  transportLog.clear()
  resetStats()
}
