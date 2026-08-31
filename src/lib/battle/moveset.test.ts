import { describe, expect, it } from 'vitest'
import type { Move } from 'pokenode-ts'
import { FALLBACK_MOVE, battleMoveset } from './moveset'

function link(name: string) {
  return { name, url: `https://pokeapi.co/api/v2/${name}` }
}

interface Spec {
  power?: number | null
  type?: string
  damageClass?: string
  accuracy?: number | null
  pp?: number
  priority?: number
}

function move(name: string, spec: Spec = {}): Move {
  const {
    power = 60,
    type = 'normal',
    damageClass = 'physical',
    accuracy = 100,
    pp = 20,
    priority = 0,
  } = spec

  return {
    name,
    power,
    accuracy,
    pp,
    priority,
    type: link(type),
    damage_class: link(damageClass),
  } as Move
}

const names = (moves: readonly { name: string }[]) => moves.map((entry) => entry.name)

describe('battleMoveset', () => {
  it('leaves out the status moves this tier has no effects for', () => {
    const moveset = battleMoveset([move('tackle'), move('growl', { power: null })])

    expect(names(moveset)).toEqual(['tackle', 'struggle', 'struggle', 'struggle'])
  })

  it('brings the strongest four and drops the rest', () => {
    const moveset = battleMoveset([
      move('a', { power: 40 }),
      move('b', { power: 120 }),
      move('c', { power: 60 }),
      move('d', { power: 90 }),
      move('e', { power: 100 }),
    ])

    expect(names(moveset)).toEqual(['b', 'e', 'd', 'c'])
  })

  it('pads the empty slots so a thin learnset still fills a menu', () => {
    const moveset = battleMoveset([move('tackle')])

    expect(moveset).toHaveLength(4)
    expect(moveset[3]).toEqual(FALLBACK_MOVE)
  })

  it('gives each padded slot its own PP to spend', () => {
    const moveset = battleMoveset([])
    moveset[0].pp -= 1

    expect(moveset[1].pp).toBe(FALLBACK_MOVE.pp)
  })

  it('takes a move once however many times the learnset lists it', () => {
    const moveset = battleMoveset([move('tackle'), move('tackle'), move('scratch')])

    expect(names(moveset)).toEqual(['scratch', 'tackle', 'struggle', 'struggle'])
  })

  it('drops a move typed as something no Pokémon can be', () => {
    const moveset = battleMoveset([move('tackle'), move('tera-blast', { type: 'stellar' })])

    expect(names(moveset)).toEqual(['tackle', 'struggle', 'struggle', 'struggle'])
  })

  it('carries the accuracy, priority and damage class the move was defined with', () => {
    const [quick] = battleMoveset([
      move('quick-attack', { priority: 1, accuracy: null, damageClass: 'special', pp: 30 }),
    ])

    expect(quick).toEqual({
      name: 'quick-attack',
      type: 'normal',
      power: 60,
      accuracy: null,
      damageClass: 'special',
      pp: 30,
      maxPp: 30,
      priority: 1,
    })
  })
})
