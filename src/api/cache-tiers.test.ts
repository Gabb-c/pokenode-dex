import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MainClient, WebStorageCache, type Logger, type WebStorageLike } from 'pokenode-ts'

/**
 * The transport tier, exercised against a stub PokéAPI.
 *
 * This asserts the configuration in `client.ts` behaves as documented — that a
 * response survives a reload and that an expired entry costs a 304 rather than
 * a body. The real API is not involved: the point is the wiring, not the network.
 */

const BODY = { id: 25, name: 'pikachu' }
const ETAG = 'W/"pikachu-v1"'

function memoryStorage(): WebStorageLike & { size: () => number } {
  const entries = new Map<string, string>()
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
    getAllKeys: () => [...entries.keys()],
    size: () => entries.size,
  }
}

function stubApi() {
  const hits: string[] = []
  const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    hits.push(url)
    if (new Headers(init?.headers).get('if-none-match') === ETAG) {
      return new Response(null, { status: 304, headers: { etag: ETAG } })
    }
    return new Response(JSON.stringify(BODY), {
      status: 200,
      headers: { 'content-type': 'application/json', etag: ETAG },
    })
  })
  return { fetch, hits }
}

function sources(): { logger: Logger; seen: string[] } {
  const seen: string[] = []
  return {
    seen,
    logger: {
      debug: (payload) => {
        if (payload.event === 'response') seen.push(payload.source)
      },
      error: () => {},
    },
  }
}

describe('the transport tier', () => {
  let storage: ReturnType<typeof memoryStorage>

  beforeEach(() => {
    storage = memoryStorage()
  })

  const client = (ttl: number, api: ReturnType<typeof stubApi>, logger: Logger) =>
    new MainClient({
      cache: new WebStorageCache({ storage, ttl, prefix: 'pokenode-dex:' }),
      revalidate: true,
      logger,
      fetch: api.fetch,
    })

  it('serves a repeat call from cache without touching the network', async () => {
    const api = stubApi()
    const { logger, seen } = sources()
    const pokeapi = client(60_000, api, logger)

    await pokeapi.pokemon.getPokemonByName('pikachu')
    await pokeapi.pokemon.getPokemonByName('pikachu')

    expect(seen).toEqual(['network', 'cache'])
    expect(api.fetch).toHaveBeenCalledTimes(1)
  })

  it('coalesces two callers asking at the same moment into one round trip', async () => {
    const api = stubApi()
    const { logger, seen } = sources()
    const pokeapi = client(60_000, api, logger)

    await Promise.all([
      pokeapi.pokemon.getPokemonByName('pikachu'),
      pokeapi.pokemon.getPokemonByName('pikachu'),
    ])

    expect(seen).toContain('in-flight')
    expect(api.fetch).toHaveBeenCalledTimes(1)
  })

  it('survives a reload: a new client reads what the old one stored', async () => {
    const api = stubApi()
    const first = sources()
    await client(60_000, api, first.logger).pokemon.getPokemonByName('pikachu')
    expect(storage.size()).toBeGreaterThan(0)

    const second = sources()
    const reloaded = await client(60_000, api, second.logger).pokemon.getPokemonByName('pikachu')

    expect(second.seen).toEqual(['cache'])
    expect(api.fetch).toHaveBeenCalledTimes(1)
    expect(reloaded.name).toBe('pikachu')
  })

  it('revalidates an expired entry instead of downloading it again', async () => {
    const api = stubApi()
    const { logger, seen } = sources()
    // A zero TTL expires every entry the moment it is written.
    const pokeapi = client(0, api, logger)

    await pokeapi.pokemon.getPokemonByName('pikachu')
    const again = await pokeapi.pokemon.getPokemonByName('pikachu')

    expect(seen).toEqual(['network', 'revalidated'])
    expect(api.fetch).toHaveBeenCalledTimes(2)
    // The second response carried no body; the stored one was reused.
    expect(again.name).toBe('pikachu')
  })

  it('shares one cache across section clients', async () => {
    const api = stubApi()
    const { logger, seen } = sources()
    const pokeapi = client(60_000, api, logger)

    await pokeapi.pokemon.getPokemonByName('pikachu')
    await pokeapi.resolve<typeof BODY>('https://pokeapi.co/api/v2/pokemon/pikachu')

    expect(seen).toEqual(['network', 'cache'])
    expect(api.fetch).toHaveBeenCalledTimes(1)
  })
})

/**
 * The tallies the status rail reads, which come from the client rather than
 * from the event log — the two answer differently, and the client is right.
 */
describe('the transport tally', () => {
  it('counts a retried resolution once, and every attempt it cost', async () => {
    let attempts = 0
    const pokeapi = new MainClient({
      retry: { attempts: 3, initialDelay: 0 },
      fetch: async () => {
        attempts += 1
        return attempts < 3
          ? new Response(null, { status: 503 })
          : new Response(JSON.stringify(BODY), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            })
      },
    })

    await pokeapi.pokemon.getPokemonByName('pikachu')
    const { network, revalidated, roundTrips } = pokeapi.stats

    expect(network).toBe(1)
    // Three requests left the process for one downloaded body, so the count the
    // rail used to compute — `network + revalidated` — was short by two.
    expect(roundTrips).toBe(3)
    expect(roundTrips).not.toBe(network + revalidated)
  })

  it('subtracts a kept snapshot, which is how "clear caches" starts from zero', async () => {
    const api = stubApi()
    const pokeapi = new MainClient({
      cache: new WebStorageCache({ storage: memoryStorage(), ttl: 60_000, prefix: 'pokenode-dex:' }),
      fetch: api.fetch,
    })

    await pokeapi.pokemon.getPokemonByName('pikachu')
    const baseline = pokeapi.stats
    await pokeapi.pokemon.getPokemonByName('pikachu')

    expect(pokeapi.stats.network).toBe(1)
    expect(pokeapi.statsSince(baseline)).toMatchObject({ network: 0, cache: 1, roundTrips: 0 })
  })
})
