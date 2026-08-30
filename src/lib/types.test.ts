import { describe, expect, it } from 'vitest'
import { BATTLE_TYPES, notableMatchups, type Matchups } from './types'

/** A neutral chart with only the named cells moved off 1. */
function chart(cells: Partial<Matchups>): Matchups {
  return { ...(Object.fromEntries(BATTLE_TYPES.map((name) => [name, 1])) as Matchups), ...cells }
}

describe('BATTLE_TYPES', () => {
  it('is the eighteen battle types, without the Tera type or the side-game placeholders', () => {
    expect(BATTLE_TYPES).toHaveLength(18)
    expect(BATTLE_TYPES).not.toContain('stellar')
    expect(BATTLE_TYPES).not.toContain('unknown')
    expect(BATTLE_TYPES).not.toContain('shadow')
  })
})

describe('notableMatchups', () => {
  it('sorts each cell by what it means and drops the neutral ones', () => {
    const { weaknesses, resistances, immunities } = notableMatchups(
      chart({ normal: 0, dark: 2, poison: 0.5 }),
    )

    expect(immunities).toEqual(['normal'])
    expect(weaknesses).toEqual(['dark'])
    expect(resistances).toEqual(['poison'])
  })

  it('reads the compounded cells a dual type produces', () => {
    const { weaknesses, resistances } = notableMatchups(chart({ water: 4, grass: 0.25 }))

    expect(weaknesses).toEqual(['water'])
    expect(resistances).toEqual(['grass'])
  })

  it('ignores a stellar cell the library chart carries', () => {
    const { weaknesses } = notableMatchups({ ...chart({ dark: 2 }), stellar: 2 } as Matchups)

    expect(weaknesses).toEqual(['dark'])
  })
})
