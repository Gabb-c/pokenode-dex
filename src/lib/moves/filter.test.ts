import { describe, expect, it } from 'vitest'
import type { MoveDamageClass, Type } from 'pokenode-ts'
import type { MoveEntry } from '@/api/queries/moves'
import { filterMoves, indexMoves } from './filter'

function link(id: number, name: string) {
  return { name, url: `https://pokeapi.co/api/v2/move/${id}/` }
}

const INDEX: MoveEntry[] = [
  { id: 1, name: 'pound' },
  { id: 85, name: 'thunderbolt' },
  { id: 86, name: 'thunder-wave' },
  { id: 94, name: 'psychic' },
]

const TYPES = [
  { name: 'electric', moves: [link(85, 'thunderbolt'), link(86, 'thunder-wave')] },
  { name: 'psychic', moves: [link(94, 'psychic')] },
  { name: 'normal', moves: [link(1, 'pound')] },
] as unknown as Type[]

const CLASSES = [
  { name: 'special', moves: [link(85, 'thunderbolt'), link(94, 'psychic')] },
  { name: 'status', moves: [link(86, 'thunder-wave')] },
  { name: 'physical', moves: [link(1, 'pound')] },
] as unknown as MoveDamageClass[]

const ROWS = indexMoves(INDEX, TYPES, CLASSES)

describe('indexMoves', () => {
  it('reads the type and class off the resources that carry the move', () => {
    expect(ROWS.find((row) => row.name === 'thunderbolt')).toMatchObject({
      type: 'electric',
      damageClass: 'special',
    })
  })

  it('leaves both absent until the reference queries land', () => {
    expect(indexMoves(INDEX, undefined, undefined)[0]).toEqual({ id: 1, name: 'pound' })
  })
})

describe('filterMoves', () => {
  it('returns everything when nothing is asked for', () => {
    expect(filterMoves(ROWS, '', '', '')).toHaveLength(4)
  })

  it('intersects the filters', () => {
    expect(filterMoves(ROWS, '', 'electric', 'special').map((row) => row.name)).toEqual([
      'thunderbolt',
    ])
  })

  it('matches a typed space against the slug', () => {
    expect(filterMoves(ROWS, 'thunder wave', '', '').map((row) => row.name)).toEqual([
      'thunder-wave',
    ])
  })

  it('keeps a row whose type has not arrived rather than blanking the list', () => {
    const bare = indexMoves(INDEX, undefined, undefined)
    expect(filterMoves(bare, '', 'electric', '')).toHaveLength(4)
  })
})
