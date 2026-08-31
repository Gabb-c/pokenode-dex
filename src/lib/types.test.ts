import { describe, expect, it } from 'vitest'
import type { Type } from 'pokenode-ts'
import { BATTLE_TYPES, notableMatchups, typeIcon, type Matchups } from './types'

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

describe('typeIcon', () => {
  function type(sprites: Record<string, Record<string, { symbol_icon: string | null }>>): Type {
    return { name: 'fire', sprites } as unknown as Type
  }

  it('takes the symbol from the newest generation that drew one', () => {
    const icon = typeIcon(
      type({
        'generation-viii': { 'sword-shield': { symbol_icon: 'old.png' } },
        'generation-ix': { 'scarlet-violet': { symbol_icon: 'new.png' } },
      }),
    )
    expect(icon).toBe('new.png')
  })

  it('falls back a generation when the newest published none', () => {
    const icon = typeIcon(
      type({
        'generation-viii': { 'sword-shield': { symbol_icon: 'old.png' } },
        'generation-ix': { 'scarlet-violet': { symbol_icon: null } },
      }),
    )
    expect(icon).toBe('old.png')
  })

  it('tries every game of a generation before giving up on it', () => {
    const icon = typeIcon(
      type({
        'generation-viii': {
          'brilliant-diamond-shining-pearl': { symbol_icon: null },
          'sword-shield': { symbol_icon: 'found.png' },
        },
        'generation-ix': { 'scarlet-violet': { symbol_icon: null } },
      }),
    )
    expect(icon).toBe('found.png')
  })

  it('answers nothing for a type no game drew a symbol for', () => {
    const icon = typeIcon(
      type({
        'generation-viii': { 'sword-shield': { symbol_icon: null } },
        'generation-ix': { 'scarlet-violet': { symbol_icon: null } },
      }),
    )
    expect(icon).toBeUndefined()
  })
})
