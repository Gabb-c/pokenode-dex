import { describe, expect, it } from 'vitest'
import type { Encounter, LocationAreaEncounter } from 'pokenode-ts'
import { encountersIn, versionsOf } from './encounters'

function link(name: string) {
  return { name, url: `https://pokeapi.co/api/v2/${name}` }
}

function slot(
  method: string,
  chance: number,
  minLevel: number,
  maxLevel: number,
  ...conditions: string[]
): Encounter {
  return {
    method: link(method),
    chance,
    min_level: minLevel,
    max_level: maxLevel,
    condition_values: conditions.map(link),
    pokemon_details: null,
  }
}

const AREAS: LocationAreaEncounter[] = [
  {
    location_area: link('viridian-forest-area'),
    version_details: [
      {
        version: link('red'),
        max_chance: 55,
        encounter_details: [
          slot('walk', 25, 3, 4),
          slot('walk', 20, 5, 5),
          slot('walk', 10, 3, 3, 'time-morning'),
        ],
      },
      {
        version: link('yellow'),
        max_chance: 5,
        encounter_details: [slot('walk', 5, 4, 4)],
      },
    ],
  },
  {
    location_area: link('power-plant-area'),
    version_details: [
      {
        version: link('red'),
        max_chance: 10,
        encounter_details: [slot('walk', 10, 20, 24)],
      },
    ],
  },
]

describe('versionsOf', () => {
  it('lists the versions in the payload, newest first', () => {
    expect(versionsOf(AREAS)).toEqual(['yellow', 'red'])
  })

  it('is empty for a Pokémon found nowhere', () => {
    expect(versionsOf([])).toEqual([])
  })

  it('files an expansion beside its twin, not after the games that followed it', () => {
    const late: LocationAreaEncounter[] = [
      {
        location_area: link('anywhere'),
        version_details: [
          { version: link('the-isle-of-armor-shield'), max_chance: 5, encounter_details: [] },
          { version: link('scarlet'), max_chance: 5, encounter_details: [] },
        ],
      },
    ]

    expect(versionsOf(late)).toEqual(['scarlet', 'the-isle-of-armor-shield'])
  })
})

describe('encountersIn', () => {
  it('folds the slots of one method into a single row', () => {
    const [first] = encountersIn(AREAS, 'red')

    expect(first.area.name).toBe('viridian-forest-area')
    expect(first.chance).toBe(55)
    expect(first.minLevel).toBe(3)
    expect(first.maxLevel).toBe(5)
    expect(first.conditions).toEqual(['time-morning'])
  })

  it('orders rows by how likely they are', () => {
    expect(encountersIn(AREAS, 'red').map((row) => row.area.name)).toEqual([
      'viridian-forest-area',
      'power-plant-area',
    ])
  })

  it('keeps versions apart', () => {
    expect(encountersIn(AREAS, 'yellow')).toHaveLength(1)
    expect(encountersIn(AREAS, 'gold')).toEqual([])
  })
})
