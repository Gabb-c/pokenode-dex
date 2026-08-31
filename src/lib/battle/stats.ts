import type { Nature, Pokemon } from 'pokenode-ts'

export interface BattleStats {
  hp: number
  attack: number
  defense: number
  specialAttack: number
  specialDefense: number
  speed: number
}

export type StatKey = keyof BattleStats

/**
 * How a Pokémon was raised.
 *
 * Every field is optional and the defaults are the duel's: perfect IVs, no EVs,
 * neutral nature. A duel between two Pokémon nobody trained is only fair if
 * neither carries a spread the other does not, and pinning all three makes the
 * whole engine deterministic — the only randomness left is the one the caller
 * injects. The dex's calculator is the caller that fills them in.
 */
export interface Spread {
  ivs?: number
  evs?: Partial<Record<StatKey, number>>
  nature?: Nature | null
}

const PERFECT_IV = 31

/** The API's stat slugs, in the order the games list them. */
const KEYS: Record<string, StatKey> = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
}

/** The `BattleStats` field one of the API's stat slugs names, if it is one of the six. */
export function statKey(slug: string): StatKey | undefined {
  return KEYS[slug]
}

/**
 * HP is its own formula — the `+ level + 10` is what keeps a level 50 Shedinja
 * from having one hit point and a level 50 Blissey from being unkillable, and
 * no nature has ever touched it.
 */
function hpAt(base: number, level: number, iv: number, ev: number): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10
}

function statAt(base: number, level: number, iv: number, ev: number, nature: number): number {
  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5
  return Math.floor(raw * nature)
}

/** A nature raises one stat by a tenth and drops another; a neutral one names neither. */
function modifierFor(nature: Nature | null | undefined, key: StatKey): number {
  if (!nature) return 1
  if (nature.increased_stat && statKey(nature.increased_stat.name) === key) return 1.1
  if (nature.decreased_stat && statKey(nature.decreased_stat.name) === key) return 0.9
  return 1
}

/**
 * A Pokémon's six battle stats at a level.
 *
 * Reads `pokemon.stats`, which every Pokémon carries in full, so this costs no
 * request. A slug the map does not know is skipped rather than thrown on: the
 * API has added stats before and a battle only needs these six.
 */
export function battleStats(pokemon: Pokemon, level: number, spread: Spread = {}): BattleStats {
  const stats: BattleStats = {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  }

  const iv = spread.ivs ?? PERFECT_IV

  for (const entry of pokemon.stats) {
    const key = statKey(entry.stat.name)
    if (!key) continue
    const ev = spread.evs?.[key] ?? 0
    stats[key] =
      key === 'hp'
        ? hpAt(entry.base_stat, level, iv, ev)
        : statAt(entry.base_stat, level, iv, ev, modifierFor(spread.nature, key))
  }

  return stats
}
