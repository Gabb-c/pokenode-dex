import { describe, expect, it } from 'vitest'
import type { Pokemon } from 'pokenode-ts'
import { battleStats } from './battle-stats'

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
