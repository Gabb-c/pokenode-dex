import { describe, expect, it } from 'vitest'
import { filterDex } from './dex-filter'

const index = [
  { id: 1, name: 'bulbasaur' },
  { id: 4, name: 'charmander' },
  { id: 25, name: 'pikachu' },
  { id: 133, name: 'eevee' },
]
const names = (entries: { name: string }[]) => entries.map((entry) => entry.name)

describe('filterDex', () => {
  it('returns everything when nothing is filtering', () => {
    expect(filterDex(index, '', undefined, [])).toHaveLength(4)
  })

  it('matches a name anywhere in the term, case-insensitively', () => {
    expect(names(filterDex(index, 'SAUR', undefined, []))).toEqual(['bulbasaur'])
  })

  it('matches the padded dex number, so "0025" and "25" both find Pikachu', () => {
    expect(names(filterDex(index, '0025', undefined, []))).toEqual(['pikachu'])
    expect(names(filterDex(index, '25', undefined, []))).toEqual(['pikachu'])
  })

  it('intersects a generation with the query rather than replacing it', () => {
    const gen = new Set([1, 4, 25])
    expect(names(filterDex(index, 'e', gen, []))).toEqual(['charmander'])
  })

  it('requires every selected type, not any of them', () => {
    const grass = new Set([1])
    const poison = new Set([1, 25])
    expect(names(filterDex(index, '', undefined, [grass, poison]))).toEqual(['bulbasaur'])
  })

  it('skips a membership set that has not arrived instead of blanking the grid', () => {
    // The type query is still in flight; the generation filter should still apply.
    expect(names(filterDex(index, '', new Set([25, 133]), [undefined]))).toEqual([
      'pikachu',
      'eevee',
    ])
  })

  it('returns nothing when the filters genuinely exclude everything', () => {
    expect(filterDex(index, '', new Set([9999]), [])).toEqual([])
  })

  it('ignores surrounding whitespace in the query', () => {
    expect(names(filterDex(index, '  eevee  ', undefined, []))).toEqual(['eevee'])
  })
})
