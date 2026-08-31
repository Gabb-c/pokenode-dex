import { describe, expect, it } from 'vitest'
import type { LocationArea } from 'pokenode-ts'
import { encountersIn, versionsIn } from './encounters'

function slot(chance: number, min: number, max: number, method: string) {
  return {
    chance,
    min_level: min,
    max_level: max,
    method: { name: method, url: '' },
    condition_values: [],
  }
}

const AREAS = [
  {
    name: 'kanto-route-1-area',
    pokemon_encounters: [
      {
        pokemon: { name: 'pidgey', url: '' },
        version_details: [
          { version: { name: 'red', url: '' }, encounter_details: [slot(30, 2, 3, 'walk'), slot(25, 3, 5, 'walk')] },
          { version: { name: 'yellow', url: '' }, encounter_details: [slot(40, 2, 4, 'walk')] },
        ],
      },
      {
        pokemon: { name: 'rattata', url: '' },
        version_details: [
          { version: { name: 'red', url: '' }, encounter_details: [slot(20, 2, 4, 'walk')] },
        ],
      },
    ],
  },
] as unknown as LocationArea[]

describe('versionsIn', () => {
  it('names every version the areas record', () => {
    expect(versionsIn(AREAS)).toEqual(['red', 'yellow'])
  })

  it('answers nothing for an area with no encounters', () => {
    expect(versionsIn([{ name: 'empty', pokemon_encounters: [] } as unknown as LocationArea])).toEqual([])
  })
})

describe('encountersIn', () => {
  it('folds the slots of one method into a single row', () => {
    const rows = encountersIn(AREAS, 'red')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ method: 'walk', chance: 55, minLevel: 2, maxLevel: 5 })
  })

  it('sorts the likeliest first', () => {
    expect(encountersIn(AREAS, 'red').map((row) => row.pokemon.name)).toEqual([
      'pidgey',
      'rattata',
    ])
  })

  it('keeps the versions apart', () => {
    expect(encountersIn(AREAS, 'yellow').map((row) => row.pokemon.name)).toEqual(['pidgey'])
  })

  it('answers nothing for a version the areas do not record', () => {
    expect(encountersIn(AREAS, 'gold')).toEqual([])
  })

  it('caps a total chance at a hundred', () => {
    const areas = [
      {
        name: 'a',
        pokemon_encounters: [
          {
            pokemon: { name: 'magikarp', url: '' },
            version_details: [
              {
                version: { name: 'red', url: '' },
                encounter_details: [slot(70, 5, 5, 'surf'), slot(70, 5, 10, 'surf')],
              },
            ],
          },
        ],
      },
    ] as unknown as LocationArea[]
    expect(encountersIn(areas, 'red')[0].chance).toBe(100)
  })
})
