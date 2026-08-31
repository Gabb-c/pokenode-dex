import { BATTLE_TYPES, type Matchups, type TypeName } from '@/lib/types'

export interface Coverage {
  /** Members the attacking type is super effective against. */
  weak: number
  resist: number
  immune: number
}

/**
 * How a team answers each of the eighteen attacking types.
 *
 * One tally per type rather than a verdict, because a team is read for its
 * shape: four members weak to ground is a different problem from one weak and
 * none resisting, and a single number cannot say which.
 *
 * A member whose chart has not arrived is not in `charts` at all — the caller
 * passes the ones that resolved, so a team narrows into focus as they land.
 */
export function teamCoverage(charts: readonly Matchups[]): Record<TypeName, Coverage> {
  const coverage = {} as Record<TypeName, Coverage>

  for (const name of BATTLE_TYPES) {
    const tally: Coverage = { weak: 0, resist: 0, immune: 0 }
    for (const chart of charts) {
      const multiplier = chart[name]
      // Absent is not neutral: a generation-scoped chart leaves out a type that
      // did not exist yet, and guessing at it would be a made-up answer.
      if (multiplier === undefined) continue
      if (multiplier === 0) tally.immune += 1
      else if (multiplier > 1) tally.weak += 1
      else if (multiplier < 1) tally.resist += 1
    }
    coverage[name] = tally
  }

  return coverage
}

/**
 * The types nothing on the team resists or is immune to.
 *
 * The hole a team is built to close, and the reason the grid exists.
 */
export function uncovered(coverage: Record<TypeName, Coverage>): TypeName[] {
  return BATTLE_TYPES.filter((name) => {
    const tally = coverage[name]
    return tally.resist === 0 && tally.immune === 0
  })
}
