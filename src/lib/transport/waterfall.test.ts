import { describe, expect, it } from 'vitest'
import type { TransportEvent } from '@/api/transport-log'
import { waterfallRows } from './waterfall'

const POKEMON = 'https://pokeapi.co/api/v2/pokemon/pikachu'
const SPECIES = 'https://pokeapi.co/api/v2/pokemon-species/pikachu'

/** Newest first, as the store hands them out. */
const EVENTS: TransportEvent[] = [
  { kind: 'response', id: 4, at: 400, url: SPECIES, status: 304, source: 'revalidated', durationMs: 30 },
  { kind: 'request', id: 3, at: 300, url: SPECIES, method: 'GET' },
  { kind: 'response', id: 2, at: 200, url: POKEMON, status: 200, source: 'network', durationMs: 120 },
  { kind: 'request', id: 1, at: 100, url: POKEMON, method: 'GET' },
]

describe('waterfallRows', () => {
  it('folds a request and its answer into one row', () => {
    expect(waterfallRows(EVENTS, 10)).toHaveLength(2)
  })

  it('takes the start time from the request and the outcome from the answer', () => {
    expect(waterfallRows(EVENTS, 10)[1]).toMatchObject({
      url: POKEMON,
      outcome: 'network',
      status: 200,
      durationMs: 120,
      at: 100,
    })
  })

  it('reports a request with no answer yet as pending', () => {
    const rows = waterfallRows([{ kind: 'request', id: 1, at: 100, url: POKEMON, method: 'GET' }], 10)
    expect(rows[0].outcome).toBe('pending')
    expect(rows[0].durationMs).toBeUndefined()
  })

  it('carries a cancellation and its duration', () => {
    const rows = waterfallRows(
      [
        { kind: 'cancelled', id: 2, at: 200, url: POKEMON, durationMs: 15 },
        { kind: 'request', id: 1, at: 100, url: POKEMON, method: 'GET' },
      ],
      10,
    )
    expect(rows).toEqual([{ id: 2, url: POKEMON, outcome: 'cancelled', durationMs: 15, status: undefined, at: 100 }])
  })

  it('carries a failure with no duration to report', () => {
    const rows = waterfallRows(
      [{ kind: 'error', id: 2, at: 200, url: POKEMON, message: 'boom' }],
      10,
    )
    expect(rows[0].outcome).toBe('error')
    expect(rows[0].durationMs).toBeUndefined()
  })

  it('leaves retries out — they are the same request, not another one', () => {
    const rows = waterfallRows(
      [
        { kind: 'retry', id: 2, at: 200, url: POKEMON, attempt: 1, delayMs: 300 },
        { kind: 'request', id: 1, at: 100, url: POKEMON, method: 'GET' },
      ],
      10,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].outcome).toBe('pending')
  })

  it('pairs two answers for one URL with two asks rather than merging them', () => {
    const rows = waterfallRows(
      [
        { kind: 'response', id: 4, at: 400, url: POKEMON, status: 200, source: 'cache', durationMs: 1 },
        { kind: 'request', id: 3, at: 300, url: POKEMON, method: 'GET' },
        { kind: 'response', id: 2, at: 200, url: POKEMON, status: 200, source: 'network', durationMs: 90 },
        { kind: 'request', id: 1, at: 100, url: POKEMON, method: 'GET' },
      ],
      10,
    )
    expect(rows.map((row) => [row.outcome, row.at])).toEqual([
      ['cache', 300],
      ['network', 100],
    ])
  })

  it('honours the limit, keeping the newest', () => {
    expect(waterfallRows(EVENTS, 1).map((row) => row.url)).toEqual([SPECIES])
  })
})
