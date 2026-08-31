import { describe, expect, it } from 'vitest'
import type { DexEntry } from '@/api/queries/search-index'
import { matchDex } from './match'

const entry = (id: number, name: string): DexEntry => ({
  id,
  name,
  no: String(id).padStart(4, '0'),
})

const INDEX = [
  entry(25, 'pikachu'),
  entry(26, 'raichu'),
  entry(172, 'pichu'),
  entry(122, 'mr-mime'),
  entry(439, 'mime-jr'),
  entry(150, 'mewtwo'),
]

describe('matchDex', () => {
  it('ranks a prefix match above a substring one', () => {
    expect(matchDex(INDEX, 'mime').map((found) => found.name)).toEqual(['mime-jr', 'mr-mime'])
  })

  it('matches a bare dex number', () => {
    expect(matchDex(INDEX, '150').map((found) => found.name)).toEqual(['mewtwo'])
  })

  it('honours a caller that wants fewer than the default', () => {
    expect(matchDex(INDEX, 'chu', 2)).toHaveLength(2)
    expect(matchDex(INDEX, '', 1)).toHaveLength(1)
  })
})
