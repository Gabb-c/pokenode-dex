import { describe, expect, it } from 'vitest'
import type { Matchups } from '@/lib/types'
import { teamCoverage, uncovered } from './coverage'

/** Charizard: fire/flying — rock is doubled, grass is quartered, ground is nothing. */
const CHARIZARD: Matchups = { rock: 4, grass: 0.25, ground: 0, water: 2, electric: 2 }
/** Blastoise: water — grass and electric hurt, fire does not. */
const BLASTOISE: Matchups = { grass: 2, electric: 2, fire: 0.5, water: 0.5 }

describe('teamCoverage', () => {
  it('tallies each attacking type across the team', () => {
    const coverage = teamCoverage([CHARIZARD, BLASTOISE])
    expect(coverage.electric).toEqual({ weak: 2, resist: 0, immune: 0 })
    expect(coverage.grass).toEqual({ weak: 1, resist: 1, immune: 0 })
    expect(coverage.ground).toEqual({ weak: 0, resist: 0, immune: 1 })
  })

  it('counts a neutral matchup as none of the three', () => {
    expect(teamCoverage([{ normal: 1 }]).normal).toEqual({ weak: 0, resist: 0, immune: 0 })
  })

  it('skips an absent multiplier rather than reading it as neutral', () => {
    expect(teamCoverage([CHARIZARD]).fairy).toEqual({ weak: 0, resist: 0, immune: 0 })
  })

  it('answers for all eighteen types even with an empty team', () => {
    expect(Object.keys(teamCoverage([]))).toHaveLength(18)
  })
})

describe('uncovered', () => {
  it('names the types nothing on the team resists', () => {
    expect(uncovered(teamCoverage([CHARIZARD, BLASTOISE]))).toContain('electric')
  })

  it('leaves out a type the team resists', () => {
    expect(uncovered(teamCoverage([CHARIZARD, BLASTOISE]))).not.toContain('grass')
  })

  it('counts an immunity as cover', () => {
    expect(uncovered(teamCoverage([CHARIZARD]))).not.toContain('ground')
  })
})
