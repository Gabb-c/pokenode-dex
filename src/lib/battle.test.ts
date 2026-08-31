import { describe, expect, it } from 'vitest'
import { chooseFoeMove, fighterFrom, openBattle, resolveTurn, type Fighter } from './battle'
import type { BattleMove } from './battle-moveset'
import type { Matchups, TypeName } from '@/lib/types'

/** No crit, a mid roll, and every hundred-accuracy move connects. */
const STEADY = () => 0.5

function move(name: string, overrides: Partial<BattleMove> = {}): BattleMove {
  return {
    name,
    type: 'normal',
    power: 60,
    accuracy: 100,
    damageClass: 'physical',
    pp: 20,
    maxPp: 20,
    priority: 0,
    ...overrides,
  }
}

interface Build {
  hp?: number
  attack?: number
  defense?: number
  speed?: number
  types?: TypeName[]
  moves?: BattleMove[]
  chart?: Matchups
}

function fighter(name: string, build: Build = {}): Fighter {
  const {
    hp = 200,
    attack = 100,
    defense = 100,
    speed = 100,
    types = ['normal'],
    moves = [move('tackle')],
    chart = {},
  } = build

  return {
    id: 1,
    name,
    level: 50,
    types,
    stats: { hp, attack, defense, specialAttack: attack, specialDefense: defense, speed },
    hp,
    moves,
    chart,
  }
}

const kinds = (events: readonly { kind: string }[]) => events.map((event) => event.kind)
const actors = (events: readonly { kind: string; side?: string }[]) =>
  events.filter((event) => event.kind === 'use').map((event) => event.side)

describe('openBattle', () => {
  it('opens on the first turn with both sides standing', () => {
    const state = openBattle(fighter('player'), fighter('foe'))

    expect(state.turn).toBe(1)
    expect(state.outcome).toBeNull()
  })
})

describe('fighterFrom', () => {
  it('starts a fighter at full health and keeps only the types it can battle as', () => {
    const pokemon = {
      id: 25,
      name: 'pikachu',
      types: [{ slot: 1, type: { name: 'electric', url: '' } }],
      stats: [{ base_stat: 35, effort: 0, stat: { name: 'hp', url: '' } }],
    }
    const built = fighterFrom(pokemon as never, [move('thunderbolt')], { ground: 2 }, 50)

    expect(built.types).toEqual(['electric'])
    expect(built.hp).toBe(built.stats.hp)
    expect(built.hp).toBe(110)
  })
})

describe('chooseFoeMove', () => {
  it('reaches for the move that hurts the player most', () => {
    const state = openBattle(
      fighter('player', { chart: { water: 2 } }),
      fighter('foe', { moves: [move('tackle'), move('surf', { type: 'water' })] }),
    )

    expect(chooseFoeMove(state, STEADY)).toBe(1)
  })

  it('passes over a slot with no PP left, however strong it is', () => {
    const state = openBattle(
      fighter('player'),
      fighter('foe', {
        moves: [move('hyper-beam', { power: 200, pp: 0 }), move('scratch', { power: 10 })],
      }),
    )

    expect(chooseFoeMove(state, STEADY)).toBe(1)
  })
})

describe('resolveTurn', () => {
  it('lets the faster Pokémon swing first', () => {
    const fast = openBattle(fighter('player', { speed: 200 }), fighter('foe', { speed: 100 }))
    const slow = openBattle(fighter('player', { speed: 50 }), fighter('foe', { speed: 100 }))

    expect(actors(resolveTurn(fast, 0, STEADY).events)[0]).toBe('player')
    expect(actors(resolveTurn(slow, 0, STEADY).events)[0]).toBe('foe')
  })

  it('puts priority above speed', () => {
    const state = openBattle(
      fighter('player', { speed: 50, moves: [move('quick-attack', { priority: 1 })] }),
      fighter('foe', { speed: 200 }),
    )

    expect(actors(resolveTurn(state, 0, STEADY).events)[0]).toBe('player')
  })

  it('ends the turn on a faint, so a fainted Pokémon never answers', () => {
    const state = openBattle(
      fighter('player', { speed: 200, attack: 2000 }),
      fighter('foe', { speed: 100 }),
    )
    const { next, events } = resolveTurn(state, 0, STEADY)

    expect(actors(events)).toEqual(['player'])
    expect(kinds(events)).toEqual(['use', 'hit', 'faint'])
    expect(next.foe.hp).toBe(0)
    expect(next.outcome).toBe('won')
    // The counter holds on the turn the battle ended on.
    expect(next.turn).toBe(1)
  })

  it('reports a loss when the player is the one that drops', () => {
    const state = openBattle(
      fighter('player', { speed: 50 }),
      fighter('foe', { speed: 200, attack: 2000 }),
    )

    expect(resolveTurn(state, 0, STEADY).next.outcome).toBe('lost')
  })

  it('spends a point of PP from the slot that was used', () => {
    const state = openBattle(
      fighter('player', { moves: [move('tackle'), move('scratch')] }),
      fighter('foe'),
    )
    const { next } = resolveTurn(state, 1, STEADY)

    expect(next.player.moves[0].pp).toBe(20)
    expect(next.player.moves[1].pp).toBe(19)
  })

  it('falls through to struggle when the chosen slot is spent, and charges it to nothing', () => {
    const state = openBattle(
      fighter('player', { speed: 200, moves: [move('tackle', { pp: 0 })] }),
      fighter('foe'),
    )
    const { next, events } = resolveTurn(state, 0, STEADY)

    expect(events[0]).toEqual({ kind: 'use', side: 'player', move: 'struggle' })
    expect(next.player.moves[0].pp).toBe(0)
  })

  it('records a miss instead of a hit when the draw beats the accuracy', () => {
    const state = openBattle(
      fighter('player', { speed: 200, moves: [move('focus-blast', { accuracy: 10 })] }),
      fighter('foe'),
    )
    const { next, events } = resolveTurn(state, 0, () => 0.99)

    expect(kinds(events).slice(0, 2)).toEqual(['use', 'miss'])
    expect(next.foe.hp).toBe(next.foe.stats.hp)
  })

  it('leaves a decided battle alone', () => {
    const state = openBattle(fighter('player'), fighter('foe'))
    const decided = { ...state, outcome: 'won' as const }

    expect(resolveTurn(decided, 0, STEADY)).toEqual({ next: decided, events: [] })
  })

  it('does not write through to the state it was given', () => {
    const state = openBattle(fighter('player'), fighter('foe'))
    resolveTurn(state, 0, STEADY)

    expect(state.foe.hp).toBe(state.foe.stats.hp)
    expect(state.player.moves[0].pp).toBe(20)
    expect(state.turn).toBe(1)
  })
})
