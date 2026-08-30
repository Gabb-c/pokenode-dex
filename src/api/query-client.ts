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
 * What a loader wants from `queryClient.query`: whatever is cached, at any age,
 * and a fetch only when there is nothing.
 *
 * This is the contract the deprecated `ensureQueryData` had. `staleTime:
 * 'static'` states it for the one call without touching what the query's own
 * observers treat as fresh, so the tier invariant above still holds.
 */
export function cached<T extends object>(options: T): T & { staleTime: 'static' } {
  return { ...options, staleTime: 'static' }
}

/**
 * L1 hits, which nothing beneath this tier can see.
 *
 * A query answered from Query's own cache never reaches the transport, so it
 * raises no event and moves none of the client's counts — the rail would read
 * flat while the app served everything from memory.
 *
 * `observerAdded` fires before the observer decides whether to fetch, so the
 * decision is read a microtask later rather than predicted: an observer that
 * mounted onto data and stayed idle was served here.
 */
let hits = 0
const listeners = new Set<() => void>()

queryClient.getQueryCache().subscribe((event) => {
  if (event.type !== 'observerAdded' || event.query.state.data === undefined) return
  queueMicrotask(() => {
    if (event.query.state.fetchStatus !== 'idle') return
    hits += 1
    for (const listener of listeners) listener()
  })
})

export const l1Hits = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get(): number {
    return hits
  },
  clear() {
    hits = 0
    for (const listener of listeners) listener()
  },
}

/**
 * Both tiers, in the only order that works.
 *
 * Dropping Query alone would refill it from the transport cache on the next
 * render, so nothing would appear to have been cleared.
 */
export async function clearAllCaches(): Promise<void> {
  queryClient.clear()
  await api.clearCache()
  resetStats()
  l1Hits.clear()
  transportLog.clear()
}
