import { describe, expect, it } from 'vitest'
import type { Pokemon, PokemonType } from 'pokenode-ts'
import { typesIn } from './past-types'

function link(name: string) {
  return { name, url: `https://pokeapi.co/api/v2/${name}` }
}

function slots(...names: string[]): PokemonType[] {
  return names.map((name, index) => ({ slot: index + 1, type: link(name) }))
}

function pokemon(types: PokemonType[], past: Pokemon['past_types'] = []): Pokemon {
  return { types, past_types: past } as Pokemon
}

const MAGNEMITE = pokemon(slots('electric', 'steel'), [
  { generation: link('generation-i'), types: slots('electric') },
])

const CLEFAIRY = pokemon(slots('fairy'), [
  { generation: link('generation-v'), types: slots('normal') },
])

describe('typesIn', () => {
  it('returns the current typing when no generation is asked for', () => {
    expect(typesIn(MAGNEMITE).map((slot) => slot.type.name)).toEqual(['electric', 'steel'])
  })

  it('reads a past entry as the last generation it applied to', () => {
    expect(typesIn(MAGNEMITE, 'generation-i').map((slot) => slot.type.name)).toEqual(['electric'])
  })

  it('falls through to the current typing once the past entry has lapsed', () => {
    expect(typesIn(MAGNEMITE, 'generation-ii').map((slot) => slot.type.name)).toEqual([
      'electric',
      'steel',
    ])
  })

  it('holds a past entry for every generation it covers', () => {
    for (const generation of ['generation-i', 'generation-iii', 'generation-v'] as const) {
      expect(typesIn(CLEFAIRY, generation).map((slot) => slot.type.name)).toEqual(['normal'])
    }
    expect(typesIn(CLEFAIRY, 'generation-vi').map((slot) => slot.type.name)).toEqual(['fairy'])
  })

  it('leaves a Pokémon with no history alone', () => {
    const gengar = pokemon(slots('ghost', 'poison'))
    expect(typesIn(gengar, 'generation-i')).toBe(gengar.types)
  })
})
