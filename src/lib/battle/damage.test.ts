import { describe, expect, it } from 'vitest'
import type { Fighter } from './engine'
import type { BattleMove } from './moveset'
import { damageOf, effectivenessOf, landsHit } from './damage'
import type { Matchups, TypeName } from '@/lib/types'

/** The draws in the order `damageOf` takes them: crit, then the roll. */
function draws(...values: number[]): () => number {
  return () => values.shift() ?? 0
}

function move(overrides: Partial<BattleMove> = {}): BattleMove {
  return {
    name: 'ember',
    type: 'fire',
    power: 90,
    accuracy: 100,
    damageClass: 'physical',
    pp: 25,
    maxPp: 25,
    priority: 0,
    ...overrides,
  }
}

function fighter(types: TypeName[], stats: Partial<Fighter['stats']>, chart: Matchups): Fighter {
  return {
    id: 1,
    name: 'test',
    level: 50,
    types,
    stats: {
      hp: 200,
      attack: 100,
      defense: 100,
      specialAttack: 100,
      specialDefense: 100,
      speed: 100,
      ...stats,
    },
    hp: 200,
    moves: [],
    chart,
  }
}

const ATTACKER = fighter(['fire'], {}, {})
const WEAK_TO_FIRE = fighter(['grass'], {}, { fire: 2 })
const IMMUNE_TO_FIRE = fighter(['normal'], {}, { fire: 0 })

describe('effectivenessOf', () => {
  it('reads the multiplier straight off the defender chart', () => {
    expect(effectivenessOf(move(), WEAK_TO_FIRE)).toBe(2)
  })

  it('treats a type the chart never mentions as neutral', () => {
    expect(effectivenessOf(move({ type: 'water' }), WEAK_TO_FIRE)).toBe(1)
  })
})

describe('landsHit', () => {
  it('never misses with a move that has no accuracy', () => {
    expect(landsHit(move({ accuracy: null }), () => 0.99)).toBe(true)
  })

  it('misses when the draw lands above the accuracy', () => {
    expect(landsHit(move({ accuracy: 50 }), () => 0.99)).toBe(false)
    expect(landsHit(move({ accuracy: 50 }), () => 0.1)).toBe(true)
  })
})

describe('damageOf', () => {
  it('applies STAB and effectiveness on top of the base formula', () => {
    const strike = damageOf(ATTACKER, WEAK_TO_FIRE, move(), draws(0.9, 0))

    expect(strike).toEqual({ damage: 104, effectiveness: 2, critical: false })
  })

  it('deals nothing at all to an immune defender, rather than the one-point floor', () => {
    const strike = damageOf(ATTACKER, IMMUNE_TO_FIRE, move(), draws(0, 0))

    expect(strike).toEqual({ damage: 0, effectiveness: 0, critical: false })
  })

  it('multiplies a critical hit in alongside the other modifiers', () => {
    const { damage, critical } = damageOf(ATTACKER, WEAK_TO_FIRE, move(), draws(0, 0))

    expect(critical).toBe(true)
    expect(damage).toBe(156)
  })

  it('spans the 85 to 100 per cent roll', () => {
    const low = damageOf(ATTACKER, WEAK_TO_FIRE, move(), draws(0.9, 0))
    const high = damageOf(ATTACKER, WEAK_TO_FIRE, move(), draws(0.9, 1))

    expect(low.damage).toBe(104)
    expect(high.damage).toBe(123)
  })

  it('leaves STAB out when the move is off-type', () => {
    const strike = damageOf(ATTACKER, WEAK_TO_FIRE, move({ type: 'water' }), draws(0.9, 0))

    expect(strike.damage).toBe(34)
  })

  it('reads the special stats for a special move', () => {
    const glassCannon = fighter(['fire'], { attack: 1, specialAttack: 200 }, {})
    const physical = damageOf(glassCannon, WEAK_TO_FIRE, move(), draws(0.9, 0))
    const special = damageOf(
      glassCannon,
      WEAK_TO_FIRE,
      move({ damageClass: 'special' }),
      draws(0.9, 0),
    )

    expect(special.damage).toBeGreaterThan(physical.damage)
  })

  it('always takes at least one point off when the hit connects', () => {
    const feeble = fighter(['normal'], { attack: 1 }, {})
    const wall = fighter(['steel'], { defense: 255 }, { normal: 0.25 })
    const strike = damageOf(feeble, wall, move({ type: 'normal', power: 10 }), draws(0.9, 0))

    expect(strike.damage).toBe(1)
  })
})
