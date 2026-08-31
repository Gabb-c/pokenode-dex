import { describe, expect, it } from 'vitest'
import type { BerryFirmness, BerryFlavor } from 'pokenode-ts'
import type { BerryEntry } from '@/api/queries/berries'
import { filterBerries, indexBerries } from './filter'

function link(id: number, name: string) {
  return { name, url: `https://pokeapi.co/api/v2/berry/${id}/` }
}

const INDEX: BerryEntry[] = [
  { id: 1, name: 'cheri' },
  { id: 2, name: 'chesto' },
  { id: 10, name: 'sitrus' },
]

const FLAVORS = [
  { name: 'spicy', berries: [{ potency: 10, berry: link(1, 'cheri') }] },
  {
    name: 'dry',
    berries: [
      { potency: 10, berry: link(2, 'chesto') },
      { potency: 10, berry: link(10, 'sitrus') },
    ],
  },
  {
    name: 'sweet',
    berries: [
      { potency: 0, berry: link(1, 'cheri') },
      { potency: 20, berry: link(10, 'sitrus') },
    ],
  },
] as unknown as BerryFlavor[]

const FIRMNESSES = [
  { name: 'soft', berries: [link(1, 'cheri')] },
  { name: 'super-hard', berries: [link(2, 'chesto')] },
  { name: 'very-soft', berries: [link(10, 'sitrus')] },
] as unknown as BerryFirmness[]

const ROWS = indexBerries(INDEX, FLAVORS, FIRMNESSES)

describe('indexBerries', () => {
  it('reads the flavours and firmness off the resources that carry the berry', () => {
    expect(ROWS.find((row) => row.name === 'cheri')).toMatchObject({
      flavors: { spicy: 10 },
      firmness: 'soft',
    })
  })

  it('drops a flavour a berry has none of', () => {
    expect(ROWS.find((row) => row.name === 'cheri')?.flavors).not.toHaveProperty('sweet')
  })

  it('names the strongest flavour as the dominant one', () => {
    expect(ROWS.find((row) => row.name === 'sitrus')?.dominant).toBe('sweet')
  })

  it('leaves both absent until the reference queries land', () => {
    expect(indexBerries(INDEX, undefined, undefined)[0]).toEqual({
      id: 1,
      name: 'cheri',
      flavors: undefined,
      dominant: undefined,
      firmness: undefined,
    })
  })
})

describe('filterBerries', () => {
  it('returns everything when nothing is asked for', () => {
    expect(filterBerries(ROWS, '', '', '')).toHaveLength(3)
  })

  it('intersects the filters', () => {
    expect(filterBerries(ROWS, '', 'dry', 'super-hard').map((row) => row.name)).toEqual(['chesto'])
  })

  it('keeps a row whose firmness has not resolved rather than dropping it', () => {
    const rows = indexBerries(INDEX, FLAVORS, undefined)
    expect(filterBerries(rows, '', '', 'soft')).toHaveLength(3)
  })

  it('trims and lowercases the term', () => {
    expect(filterBerries(ROWS, '  CHE ', '', '').map((row) => row.name)).toEqual([
      'cheri',
      'chesto',
    ])
  })

  it('answers nothing when a filter genuinely excludes everything', () => {
    expect(filterBerries(ROWS, 'nothing', '', '')).toEqual([])
  })
})
