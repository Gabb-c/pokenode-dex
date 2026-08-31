import type { Pokemon } from 'pokenode-ts'

export interface BattleStats {
  hp: number
  attack: number
  defense: number
  specialAttack: number
  specialDefense: number
  speed: number
}

/**
 * Perfect IVs, no EVs, neutral nature.
 *
 * A duel between two Pokémon nobody trained is only fair if neither carries a
 * spread the other does not, and pinning all three makes the whole engine
 * deterministic — the only randomness left is the one the caller injects.
 */
const IV = 31

/** The API's stat slugs, in the order the games list them. */
const KEYS: Record<string, keyof BattleStats> = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
}

/**
 * HP is its own formula — the `+ level + 10` is what keeps a level 50 Shedinja
 * from having one hit point and a level 50 Blissey from being unkillable.
 */
function hpAt(base: number, level: number): number {
  return Math.floor(((2 * base + IV) * level) / 100) + level + 10
}

function statAt(base: number, level: number): number {
  return Math.floor(((2 * base + IV) * level) / 100) + 5
}

/**
 * A Pokémon's six battle stats at a level.
 *
 * Reads `pokemon.stats`, which every Pokémon carries in full, so this costs no
 * request. A slug the map does not know is skipped rather than thrown on: the
 * API has added stats before and a battle only needs these six.
 */
export function battleStats(pokemon: Pokemon, level: number): BattleStats {
  const stats: BattleStats = {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  }

  for (const entry of pokemon.stats) {
    const key = KEYS[entry.stat.name]
    if (!key) continue
    stats[key] = key === 'hp' ? hpAt(entry.base_stat, level) : statAt(entry.base_stat, level)
  }

  return stats
}
