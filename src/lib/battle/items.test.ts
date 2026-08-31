import { describe, expect, it } from 'vitest'
import { heldItem, itemHeal, itemMultiplier } from './items'
import type { BattleMove } from './moveset'

function move(overrides: Partial<BattleMove> = {}): BattleMove {
  return {
    name: 'ember',
    type: 'fire',
    power: 40,
    accuracy: 100,
    damageClass: 'special',
    pp: 25,
    maxPp: 25,
    priority: 0,
    ailment: null,
    ailmentChance: 0,
    ...overrides,
  }
}

describe('heldItem', () => {
  it('knows an item this tier models', () => {
    expect(heldItem('life-orb')).toMatchObject({ name: 'life-orb', power: 1.3 })
  })

  it('leaves an item it does not model inert rather than guessing', () => {
    expect(heldItem('focus-sash')).toBeUndefined()
  })
})

describe('itemMultiplier', () => {
  it('boosts every move for a blanket item', () => {
    expect(itemMultiplier(heldItem('life-orb'), move())).toBeCloseTo(1.3)
  })

  it('boosts only the matching damage class', () => {
    expect(itemMultiplier(heldItem('choice-specs'), move())).toBeCloseTo(1.5)
    expect(itemMultiplier(heldItem('choice-specs'), move({ damageClass: 'physical' }))).toBe(1)
  })

  it('boosts only the matching type', () => {
    expect(itemMultiplier(heldItem('charcoal'), move())).toBeCloseTo(1.2)
    expect(itemMultiplier(heldItem('charcoal'), move({ type: 'water' }))).toBe(1)
  })

  it('leaves an empty hand at one', () => {
    expect(itemMultiplier(null, move())).toBe(1)
  })
})

describe('itemHeal', () => {
  it('restores a sixteenth for leftovers', () => {
    expect(itemHeal(heldItem('leftovers'), 160)).toBe(10)
  })

  it('always gives back at least a point', () => {
    expect(itemHeal(heldItem('leftovers'), 4)).toBe(1)
  })

  it('gives nothing for an item that does not heal', () => {
    expect(itemHeal(heldItem('life-orb'), 160)).toBe(0)
    expect(itemHeal(null, 160)).toBe(0)
  })
})
