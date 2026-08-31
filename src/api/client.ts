import {
  MainClient,
  MemoryCache,
  WebStorageCache,
  type CacheStore,
  type ClientStats,
} from 'pokenode-ts'
import { PREFIX, canPersist } from '@/lib/storage'
import { transportLogger } from './transport-log'

/**
 * PokéAPI resources are effectively immutable — a Pokémon's base stats do not
 * change between deploys — so the transport tier holds them for a day and asks
 * the API whether anything moved rather than downloading again.
 */
const TTL = 24 * 60 * 60 * 1000

/** `localStorage` is absent under test and throws outright in some privacy modes. */
function persistentCache(): CacheStore {
  return canPersist()
    ? new WebStorageCache({ storage: localStorage, ttl: TTL, prefix: PREFIX })
    : new MemoryCache({ ttl: TTL })
}

/**
 * The transport tier (L2).
 *
 * TanStack Query caches in memory for the lifetime of the tab; this survives a
 * reload, which is what makes a cold load paint before the network settles. On
 * expiry `revalidate` sends a conditional request, so an unchanged resource
 * costs a 304 rather than its full body.
 *
 * `retry` is deliberately left unset — the library defaults it off and Query
 * owns the retry policy, so a failure is not backed off twice.
 */
export const api = new MainClient({
  cache: persistentCache(),
  revalidate: true,
  logger: transportLogger,
})

/**
 * The transport's own tally, since the last `resetStats`.
 *
 * The counts are cumulative and the library gives no way to zero them — the
 * transport is shared by every section client, so resetting it for one reader
 * resets it for all of them. `statsSince` subtracts a kept snapshot instead,
 * which is what lets "clear caches" start the rail from zero.
 *
 * Read as a `useSyncExternalStore` snapshot, which requires a stable identity
 * between commits: the recomputed tally replaces the held one only once a count
 * has actually moved.
 */
let baseline = api.stats
let counts: ClientStats = api.statsSince(baseline)

function settled(a: ClientStats, b: ClientStats): boolean {
  return (
    a.network === b.network &&
    a.cache === b.cache &&
    a.inFlight === b.inFlight &&
    a.revalidated === b.revalidated &&
    a.roundTrips === b.roundTrips
  )
}

export function stats(): ClientStats {
  const next = api.statsSince(baseline)
  if (!settled(counts, next)) counts = next
  return counts
}

export function resetStats(): void {
  baseline = api.stats
  counts = api.statsSince(baseline)
}

/** How long a single request may run before the scope aborts it. */
const REQUEST_TIMEOUT = 8000

/** A client scoped to one unit of work — see `ClientFacade.with`. */
export function scoped(signal: AbortSignal) {
  return api.with({ signal, timeout: REQUEST_TIMEOUT })
}
