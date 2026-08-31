export interface GenderSplit {
  /** Percentages, to one decimal — the API works in eighths. */
  female: number
  male: number
}

/**
 * A species' gender ratio, from the eighths the API publishes.
 *
 * `-1` is not a ratio at all: it is how the endpoint says a species has no
 * gender, which is a different answer to an even split and has to stay one.
 */
export function genderSplit(rate: number): GenderSplit | 'genderless' {
  if (rate < 0) return 'genderless'
  const female = (rate / 8) * 100
  return { female, male: 100 - female }
}

/**
 * Steps to hatch an egg.
 *
 * The counter is cycles, and a cycle has been 255 steps since Gen I — the games
 * from Black and White on run 257, which is close enough that showing both
 * would be noise.
 */
export function eggSteps(hatchCounter: number): number {
  return (hatchCounter + 1) * 255
}
