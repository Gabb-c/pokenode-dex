import type { Move } from 'pokenode-ts'
import { isBattleType, type TypeName } from '@/lib/types'

export interface BattleMove {
  name: string
  type: TypeName
  power: number
  /** Null for a move that cannot miss. */
  accuracy: number | null
  damageClass: 'physical' | 'special'
  pp: number
  maxPp: number
  priority: number
}

/** Four slots, as the games have always had. */
const MOVES = 4

/**
 * What a Pokémon falls back on.
 *
 * Two jobs: it pads a Pokémon whose level-up list has fewer than four damaging
 * moves in range, and it is what the engine reaches for when every slot is out
 * of PP. Without the second, a long duel could reach a turn where neither side
 * has anything to do.
 *
 * Recoil is not modelled, so this is the real move's shape without its cost.
 */
export const FALLBACK_MOVE: BattleMove = {
  name: 'struggle',
  type: 'normal',
  power: 50,
  accuracy: null,
  damageClass: 'physical',
  pp: 10,
  maxPp: 10,
  priority: 0,
}

/** What a move with no PP of its own is given, as the fallback move has. */
const DEFAULT_PP = 10

/**
 * Status moves carry no power, and this tier has no effects for them to apply.
 * A type no Pokémon can be — Stellar — goes with them: the chart has no row.
 */
function toBattleMove(move: Move): BattleMove | undefined {
  const { power } = move
  if (power === null || power <= 0 || !isBattleType(move.type.name)) return undefined

  const pp = move.pp ?? DEFAULT_PP

  return {
    name: move.name,
    type: move.type.name,
    power,
    accuracy: move.accuracy,
    damageClass: move.damage_class?.name === 'special' ? 'special' : 'physical',
    pp,
    maxPp: pp,
    priority: move.priority,
  }
}

/**
 * Four moves, strongest first, padded when the learnset cannot fill the slots.
 *
 * The caller has already decided which moves are in range — this only picks
 * among them, so it stays pure and costs nothing. Ties break on name so the
 * same Pokémon always brings the same four.
 */
export function battleMoveset(moves: readonly Move[]): BattleMove[] {
  const seen = new Set<string>()
  const chosen: BattleMove[] = []

  for (const move of moves) {
    if (seen.has(move.name)) continue
    const battleMove = toBattleMove(move)
    if (!battleMove) continue
    seen.add(move.name)
    chosen.push(battleMove)
  }

  chosen.sort((a, b) => b.power - a.power || a.name.localeCompare(b.name))
  const moveset = chosen.slice(0, MOVES)
  while (moveset.length < MOVES) moveset.push({ ...FALLBACK_MOVE })
  return moveset
}
