import { describe, expect, it } from 'vitest'
import type { Nature, Pokemon } from 'pokenode-ts'
import { battleStats } from './stats'

function link(name: string) {
  return { name, url: `https://pokeapi.co/api/v2/${name}` }
}

function pokemon(bases: Record<string, number>): Pokemon {
  const stats = Object.entries(bases).map(([name, base]) => ({
    base_stat: base,
    effort: 0,
    stat: link(name),
  }))
  return { stats } as Pokemon
}

const PIKACHU = pokemon({
  hp: 35,
  attack: 55,
  defense: 40,
  'special-attack': 50,
  'special-defense': 50,
  speed: 90,
})

const GARCHOMP = pokemon({
  hp: 108,
  attack: 130,
  defense: 95,
  'special-attack': 80,
  'special-defense': 85,
  speed: 102,
})

/** Adamant: attack up, special attack down. */
const NATURE = {
  increased_stat: link('attack'),
  decreased_stat: link('special-attack'),
} as unknown as Nature

describe('battleStats', () => {
  it('matches the games at level 50 with perfect IVs and no EVs', () => {
    expect(battleStats(PIKACHU, 50)).toEqual({
      hp: 110,
      attack: 75,
      defense: 60,
      specialAttack: 70,
      specialDefense: 70,
      speed: 110,
    })
  })

  it('gives HP the extra points the other five stats do not get', () => {
    const even = pokemon({ hp: 50, attack: 50 })
    const { hp, attack } = battleStats(even, 50)

    expect(hp - attack).toBe(55)
  })

  it('scales with level', () => {
    const low = battleStats(PIKACHU, 5)
    const high = battleStats(PIKACHU, 100)

    expect(low.speed).toBeLessThan(high.speed)
    expect(high.speed).toBe(216)
  })

  it('skips a stat slug it does not know rather than throwing', () => {
    const odd = pokemon({ hp: 35, accuracy: 100 })

    expect(battleStats(odd, 50).hp).toBe(110)
  })
})

describe('battleStats with a spread', () => {
  it('raises the nature\'s stat by a tenth and drops the other', () => {
    const neutral = battleStats(GARCHOMP, 50)
    const adamant = battleStats(GARCHOMP, 50, { nature: NATURE })
    expect(adamant.attack).toBe(Math.floor(neutral.attack * 1.1))
    expect(adamant.specialAttack).toBe(Math.floor(neutral.specialAttack * 0.9))
  })

  it('leaves HP alone, which no nature has ever touched', () => {
    expect(battleStats(GARCHOMP, 50, { nature: NATURE }).hp).toBe(battleStats(GARCHOMP, 50).hp)
  })

  it('counts four EVs as a point', () => {
    const trained = battleStats(GARCHOMP, 100, { evs: { attack: 252 } })
    expect(trained.attack - battleStats(GARCHOMP, 100).attack).toBe(63)
  })

  it('takes an IV floor as readily as the perfect default', () => {
    expect(battleStats(GARCHOMP, 50, { ivs: 0 }).speed).toBeLessThan(battleStats(GARCHOMP, 50).speed)
  })

  it('treats a neutral nature as no nature at all', () => {
    const neutral = { increased_stat: null, decreased_stat: null } as unknown as Nature
    expect(battleStats(GARCHOMP, 50, { nature: neutral })).toEqual(battleStats(GARCHOMP, 50))
  })
})
