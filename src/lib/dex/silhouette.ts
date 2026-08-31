import type { DexEntry } from '@/api/queries/search-index'

/**
 * Where the national dex ends and the alternate forms begin.
 *
 * `listPokemons` numbers every mega, regional and battle form from 10001 up.
 * The silhouette of a Charizard Mega X is not a question anyone can answer, so
 * the pool stops short of them.
 */
const FIRST_FORM_ID = 10000

/**
 * The entries a round may draw from.
 *
 * A membership set still in flight is skipped rather than treated as empty —
 * the same rule `filterDex` follows, so the pool narrows when the generation
 * lands instead of emptying while it is on the way.
 */
export function playablePool(
  index: readonly DexEntry[],
  members?: ReadonlySet<number>,
): DexEntry[] {
  return index.filter((entry) => entry.id < FIRST_FORM_ID && (!members || members.has(entry.id)))
}

/**
 * The next answer, avoiding what this run has already asked.
 *
 * Once the run has seen the whole pool it starts over: a streak ends on lives,
 * never on running out of Pokémon. `random` is a parameter so a test can pin
 * the draw.
 */
export function pickAnswer(
  pool: readonly DexEntry[],
  seen: ReadonlySet<number>,
  random: () => number = Math.random,
): DexEntry | undefined {
  if (pool.length === 0) return undefined
  const fresh = pool.filter((entry) => !seen.has(entry.id))
  const candidates = fresh.length > 0 ? fresh : pool
  return candidates[Math.min(Math.floor(random() * candidates.length), candidates.length - 1)]
}

/** `Mr. Mime`, `mr-mime` and `mrmime` are the same guess. */
function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function isCorrectGuess(guess: string, answer: DexEntry): boolean {
  return normalize(guess) === normalize(answer.name)
}
