import type { BattleMove } from '@/lib/battle-moveset'
import type { Fighter } from '@/lib/battle'

/** Same type as the attacker: the oldest bonus in the games. */
const STAB = 1.5

/** Gen VI onwards. Gen I–V dealt double, which this tier does not model. */
const CRIT = 1.5
const CRIT_CHANCE = 1 / 16

/** The damage roll spans 85%–100%, so the same move never reads as a constant. */
const MIN_ROLL = 0.85

export interface Strike {
  damage: number
  effectiveness: number
  critical: boolean
}

/**
 * What this move's type does to this defender.
 *
 * `Fighter.chart` is `defensiveProfileFrom` from the library, which already
 * answers exactly this question for all eighteen attacking types — so a dual
 * type, an immunity and a 4× weakness all come out of one cached query rather
 * than a chart of our own. Absent means the type predates nothing here: treat
 * it as neutral.
 */
export function effectivenessOf(move: BattleMove, defender: Fighter): number {
  return defender.chart[move.type] ?? 1
}

/** A move with no accuracy cannot miss. */
export function landsHit(move: BattleMove, random: () => number = Math.random): boolean {
  return move.accuracy === null || random() * 100 < move.accuracy
}

/**
 * The Gen III onwards damage formula.
 *
 * Draws in a fixed order — crit, then the roll — so a test pinning `random`
 * knows which value it is pinning. An immune matchup returns before either,
 * because zero is the one result the `max(1, …)` floor must not rescue.
 */
export function damageOf(
  attacker: Fighter,
  defender: Fighter,
  move: BattleMove,
  random: () => number = Math.random,
): Strike {
  const effectiveness = effectivenessOf(move, defender)
  if (effectiveness === 0) return { damage: 0, effectiveness, critical: false }

  const critical = random() < CRIT_CHANCE
  const roll = MIN_ROLL + random() * (1 - MIN_ROLL)

  const physical = move.damageClass === 'physical'
  const offence = physical ? attacker.stats.attack : attacker.stats.specialAttack
  const defence = physical ? defender.stats.defense : defender.stats.specialDefense

  const levelFactor = Math.floor((2 * attacker.level) / 5) + 2
  const core = Math.floor(Math.floor((levelFactor * move.power * offence) / defence) / 50) + 2

  const stab = attacker.types.includes(move.type) ? STAB : 1
  const damage = Math.floor(core * (critical ? CRIT : 1) * stab * effectiveness * roll)

  // A hit that connects always takes something off.
  return { damage: Math.max(1, damage), effectiveness, critical }
}
