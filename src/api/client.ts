import {
  MainClient,
  MemoryCache,
  WebStorageCache,
  type CacheStore,
  type ClientStats,
} from 'pokenode-ts'
import { transportLogger } from './transport-log'

/**
 * PokéAPI resources are effectively immutable — a Pokémon's base stats do not
 * change between deploys — so the transport tier holds them for a day and asks
 * the API whether anything moved rather than downloading again.
 */
const TTL = 24 * 60 * 60 * 1000

/** `localStorage` is absent under test and throws outright in some privacy modes. */
function persistentCache(): CacheStore {
  try {
    const probe = '__pokenode_dex__'
    localStorage.setItem(probe, probe)
    localStorage.removeItem(probe)
    return new WebStorageCache({ storage: localStorage, ttl: TTL, prefix: 'pokenode-dex:' })
  } catch {
    return new MemoryCache({ ttl: TTL })
  }
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
 */
let baseline = api.stats

export function stats(): ClientStats {
  return api.statsSince(baseline)
}

export function resetStats(): void {
  baseline = api.stats
}

/** How long a single request may run before the scope aborts it. */
const REQUEST_TIMEOUT = 8000

/** A client scoped to one unit of work — see `ClientFacade.with`. */
export function scoped(signal: AbortSignal) {
  return api.with({ signal, timeout: REQUEST_TIMEOUT })
}
