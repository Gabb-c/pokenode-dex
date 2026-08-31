import { describe, expect, it } from 'vitest'
import type { PokemonMove } from 'pokenode-ts'
import {
  defaultVersionGroup,
  learnMethodsOf,
  learnsetEntries,
  versionGroupsOf,
} from './learnset'

function link(name: string) {
  return { name, url: `https://pokeapi.co/api/v2/${name}` }
}

interface Taught {
  method: string
  group: string
  level?: number
}

function move(name: string, ...taught: Taught[]): PokemonMove {
  return {
    move: link(name),
    version_group_details: taught.map(({ method, group, level = 0 }) => ({
      move_learn_method: link(method),
      version_group: link(group),
      level_learned_at: level,
      order: null,
    })),
  }
}

const MOVES: PokemonMove[] = [
  move(
    'thunderbolt',
    { method: 'machine', group: 'scarlet-violet' },
    { method: 'level-up', group: 'red-blue', level: 26 },
  ),
  move('tackle', { method: 'level-up', group: 'scarlet-violet', level: 1 }),
  move('thunder-wave', { method: 'level-up', group: 'scarlet-violet', level: 4 }),
  move('agility', { method: 'egg', group: 'scarlet-violet' }),
]

describe('versionGroupsOf', () => {
  it('lists each group once, newest first', () => {
    expect(versionGroupsOf(MOVES)).toEqual(['scarlet-violet', 'red-blue'])
  })

  it('keeps a group the library has no id for, after the ones it knows', () => {
    const moves = [move('flash', { method: 'level-up', group: 'gen-99-unreleased' }), ...MOVES]
    expect(versionGroupsOf(moves)).toEqual([
      'scarlet-violet',
      'red-blue',
      'gen-99-unreleased',
    ])
  })

  it('has nothing to list for a Pokémon with no move data', () => {
    expect(versionGroupsOf([])).toEqual([])
  })

  it('sorts the Japan-only Gen 1 groups by release, not by the id the API gave them', () => {
    const moves = [
      move(
        'psychic',
        { method: 'level-up', group: 'blue-japan' },
        { method: 'level-up', group: 'scarlet-violet' },
        { method: 'level-up', group: 'red-green-japan' },
      ),
    ]
    expect(versionGroupsOf(moves)).toEqual(['scarlet-violet', 'blue-japan', 'red-green-japan'])
  })
})

describe('defaultVersionGroup', () => {
  it('opens on the newest group that teaches by level', () => {
    // Pikachu's shape: the newest games teach it by nothing but `train`.
    const moves = [
      move('body-slam', { method: 'train', group: 'champions' }),
      move('tackle', { method: 'level-up', group: 'scarlet-violet', level: 1 }),
    ]
    expect(defaultVersionGroup(moves)).toBe('scarlet-violet')
  })

  it('settles for the newest group when nothing teaches by level', () => {
    const moves = [move('transform', { method: 'train', group: 'champions' })]
    expect(defaultVersionGroup(moves)).toBe('champions')
  })

  it('has nothing to open for a Pokémon with no move data', () => {
    expect(defaultVersionGroup([])).toBeUndefined()
  })
})

describe('learnMethodsOf', () => {
  it('counts the moves each method teaches in that group alone', () => {
    expect(learnMethodsOf(MOVES, 'scarlet-violet')).toEqual([
      { name: 'level-up', count: 2 },
      { name: 'machine', count: 1 },
      { name: 'egg', count: 1 },
    ])
  })

  it('orders an unfamiliar method after the four that lead', () => {
    const moves = [...MOVES, move('transform', { method: 'form-change', group: 'scarlet-violet' })]
    expect(learnMethodsOf(moves, 'scarlet-violet').map(({ name }) => name)).toEqual([
      'level-up',
      'machine',
      'egg',
      'form-change',
    ])
  })
})

describe('learnsetEntries', () => {
  it('takes only the rows matching both the group and the method', () => {
    expect(learnsetEntries(MOVES, 'scarlet-violet', 'level-up')).toEqual([
      { link: link('tackle'), level: 1 },
      { link: link('thunder-wave'), level: 4 },
    ])
  })

  it('sorts by level, then by name for the moves sharing one', () => {
    const moves = [
      move('quick-attack', { method: 'level-up', group: 'red-blue', level: 10 }),
      move('bite', { method: 'level-up', group: 'red-blue', level: 10 }),
      move('growl', { method: 'level-up', group: 'red-blue', level: 1 }),
    ]
    expect(learnsetEntries(moves, 'red-blue', 'level-up').map((entry) => entry.link.name)).toEqual([
      'growl',
      'bite',
      'quick-attack',
    ])
  })

  it('is empty for a group this Pokémon was never in', () => {
    expect(learnsetEntries(MOVES, 'gold-silver', 'level-up')).toEqual([])
  })
})
