import { describe, expect, it } from 'vitest'
import { chooseFoeMove, fighterFrom, openBattle, resolveTurn, type Fighter } from './engine'
import { heldItem, type HeldItem } from './items'
import type { BattleMove } from './moveset'
import type { Status } from './status'
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
    ailment: null,
    ailmentChance: 0,
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
  status?: Status | null
  sleepTurns?: number
  item?: HeldItem | null
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
    status = null,
    sleepTurns = 0,
    item = null,
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
    status,
    sleepTurns,
    item,
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

describe('resolveTurn under a condition', () => {
  it('keeps a sleeping side down without spending its PP', () => {
    const state = openBattle(
      fighter('me', { status: 'sleep', sleepTurns: 3, speed: 200 }),
      fighter('foe'),
    )
    const { next, events } = resolveTurn(state, 0, STEADY)

    expect(events[0]).toMatchObject({ kind: 'blocked', side: 'player', status: 'sleep' })
    expect(next.player.moves[0].pp).toBe(20)
  })

  it('wakes on the last turn and moves the same turn', () => {
    const state = openBattle(
      fighter('me', { status: 'sleep', sleepTurns: 1, speed: 200 }),
      fighter('foe'),
    )
    const { events } = resolveTurn(state, 0, STEADY)

    expect(kinds(events).slice(0, 2)).toEqual(['cured', 'use'])
  })

  it('lets paralysis lose the turn order', () => {
    const state = openBattle(
      fighter('me', { speed: 100, status: 'paralysis' }),
      fighter('foe', { speed: 60 }),
    )
    // 0.9 clears the paralysis check, so this is speed alone deciding.
    expect(actors(resolveTurn(state, 0, () => 0.9).events)[0]).toBe('foe')
  })

  it('bites at the end of the turn and says which condition did it', () => {
    const state = openBattle(fighter('me', { status: 'poison' }), fighter('foe'))
    const { next, events } = resolveTurn(state, 0, STEADY)

    const bite = events.find((event) => event.kind === 'residual')
    expect(bite).toMatchObject({ side: 'player', status: 'poison', damage: 25 })
    expect(next.player.hp).toBeLessThan(200)
  })

  it('leaves a condition off a target that already has one', () => {
    const state = openBattle(
      fighter('me', { moves: [move('ember', { ailment: 'burn', ailmentChance: 100 })] }),
      fighter('foe', { status: 'poison' }),
    )
    const { next, events } = resolveTurn(state, 0, STEADY)

    expect(events.some((event) => event.kind === 'afflicted')).toBe(false)
    expect(next.foe.status).toBe('poison')
  })

  it('lands a condition when the draw allows it', () => {
    const state = openBattle(
      fighter('me', {
        speed: 200,
        moves: [move('ember', { ailment: 'burn', ailmentChance: 100 })],
      }),
      fighter('foe'),
    )
    const { next, events } = resolveTurn(state, 0, STEADY)

    expect(events.some((event) => event.kind === 'afflicted')).toBe(true)
    expect(next.foe.status).toBe('burn')
  })
})

describe('resolveTurn with a held item', () => {
  it('restores at the end of the turn once something has been taken off', () => {
    const state = openBattle(
      fighter('me', { item: heldItem('leftovers') ?? null }),
      fighter('foe'),
    )
    const { events } = resolveTurn(state, 0, STEADY)

    expect(events.some((event) => event.kind === 'heal')).toBe(true)
  })

  it('gives nothing back at full health', () => {
    const state = openBattle(
      fighter('me', { speed: 200, item: heldItem('leftovers') ?? null }),
      fighter('foe', { moves: [move('tackle', { accuracy: 0 })] }),
    )
    const { events } = resolveTurn(state, 0, STEADY)

    expect(events.some((event) => event.kind === 'heal')).toBe(false)
  })

  it('skips the whole end of the turn once someone has dropped', () => {
    const state = openBattle(
      fighter('me', { speed: 200, status: 'poison', attack: 5000 }),
      fighter('foe', { hp: 1 }),
    )
    const { events } = resolveTurn(state, 0, STEADY)

    expect(events.some((event) => event.kind === 'residual')).toBe(false)
  })
})
