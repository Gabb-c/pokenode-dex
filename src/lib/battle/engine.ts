import type { Pokemon } from 'pokenode-ts'
import { damageOf, effectivenessOf, landsHit } from '@/lib/battle/damage'
import { itemHeal, type HeldItem } from '@/lib/battle/items'
import { FALLBACK_MOVE, type BattleMove } from '@/lib/battle/moveset'
import { battleStats, type BattleStats } from '@/lib/battle/stats'
import {
  attempt,
  effectiveSpeed,
  residual,
  sleepFor,
  type Status,
} from '@/lib/battle/status'
import { isBattleType, type Matchups, type TypeName } from '@/lib/types'

export type Side = 'player' | 'foe'

export interface Fighter {
  id: number
  name: string
  level: number
  types: readonly TypeName[]
  stats: BattleStats
  /** Current, counting down from `stats.hp`. */
  hp: number
  moves: readonly BattleMove[]
  /** What every attacking type does to this Pokémon. See `battle-damage`. */
  chart: Matchups
  /** Null while nothing ails it. */
  status: Status | null
  /** Turns of sleep left. Meaningless unless `status` is `sleep`. */
  sleepTurns: number
  /** What it is carrying, where this tier knows what the item does. */
  item: HeldItem | null
}

/**
 * One thing that happened, in the order it happened.
 *
 * The engine hands back a whole turn's worth at once and the view replays them
 * on a clock it owns. Nothing here waits on an animation: motion is killed
 * outright under `prefers-reduced-motion`, and a battle that advanced on an
 * animation callback would never reach its second turn for those players.
 */
export type BattleEvent =
  | { kind: 'use'; side: Side; move: string }
  | { kind: 'miss'; side: Side }
  | { kind: 'hit'; side: Side; damage: number; effectiveness: number; critical: boolean }
  | { kind: 'faint'; side: Side }
  /** A condition stopped the move before it was spent. */
  | { kind: 'blocked'; side: Side; status: Status }
  /** A condition landed on this side. */
  | { kind: 'afflicted'; side: Side; status: Status }
  /** A condition lifted on its own. */
  | { kind: 'cured'; side: Side; status: Status }
  | { kind: 'residual'; side: Side; status: Status; damage: number }
  | { kind: 'heal'; side: Side; amount: number }

export interface BattleState {
  player: Fighter
  foe: Fighter
  turn: number
  /** Null while both sides are standing. */
  outcome: 'won' | 'lost' | null
}

export interface Turn {
  next: BattleState
  events: BattleEvent[]
}

function other(side: Side): Side {
  return side === 'player' ? 'foe' : 'player'
}

/**
 * A Pokémon ready to fight.
 *
 * Everything but the moveset and the chart is read off the payload the dex
 * already holds, so a fighter costs no request of its own.
 */
export function fighterFrom(
  pokemon: Pokemon,
  moves: readonly BattleMove[],
  chart: Matchups,
  level: number,
  item: HeldItem | null = null,
): Fighter {
  const stats = battleStats(pokemon, level)

  return {
    id: pokemon.id,
    name: pokemon.name,
    level,
    types: pokemon.types.map((slot) => slot.type.name).filter(isBattleType),
    stats,
    hp: stats.hp,
    moves,
    chart,
    status: null,
    sleepTurns: 0,
    item,
  }
}

export function openBattle(player: Fighter, foe: Fighter): BattleState {
  return { player, foe, turn: 1, outcome: null }
}

/**
 * The move a slot actually produces.
 *
 * An empty slot falls through to struggle rather than ending the turn, and
 * carries no slot to charge the PP to — which is what stops a battle where
 * both sides are dry from stalling forever.
 */
function pickFrom(fighter: Fighter, index: number): { move: BattleMove; slot: number | null } {
  const move = fighter.moves[index]
  return move && move.pp > 0 ? { move, slot: index } : { move: FALLBACK_MOVE, slot: null }
}

function spend(fighter: Fighter, slot: number | null): Fighter {
  if (slot === null) return fighter
  const moves = fighter.moves.map((move, index) =>
    index === slot ? { ...move, pp: move.pp - 1 } : move,
  )
  return { ...fighter, moves }
}

/**
 * The foe's pick: whatever hurts most on paper.
 *
 * Power times effectiveness times STAB is enough to make it reach for a
 * super-effective move without being unbeatable — it reads none of the
 * player's HP and never switches. Ties are broken by the draw so the same
 * matchup does not play out identically twice.
 */
export function chooseFoeMove(state: BattleState, random: () => number = Math.random): number {
  const { foe, player } = state
  const scores = foe.moves.map((move, index) => ({
    index,
    score:
      move.pp > 0
        ? move.power * effectivenessOf(move, player) * (foe.types.includes(move.type) ? 1.5 : 1)
        : -1,
  }))

  const best = Math.max(...scores.map((entry) => entry.score))
  // Every slot is spent; the caller substitutes struggle.
  if (best < 0) return 0

  const tied = scores.filter((entry) => entry.score === best)
  return tied[Math.min(Math.floor(random() * tied.length), tied.length - 1)].index
}

function firstMover(
  state: BattleState,
  playerMove: BattleMove,
  foeMove: BattleMove,
  random: () => number,
): Side {
  if (playerMove.priority !== foeMove.priority) {
    return playerMove.priority > foeMove.priority ? 'player' : 'foe'
  }
  // Paralysis is read here rather than written into the stats: a fighter's
  // stats are computed once and a condition that lifts must leave nothing behind.
  const player = effectiveSpeed(state.player.stats.speed, state.player.status)
  const foe = effectiveSpeed(state.foe.stats.speed, state.foe.status)
  if (player !== foe) return player > foe ? 'player' : 'foe'
  return random() < 0.5 ? 'player' : 'foe'
}

/**
 * Both sides act, in order, and the turn stops the moment one of them drops.
 *
 * `random` is threaded through every draw rather than reached for, so a test
 * pins the whole turn by passing a constant. The draws are not in a fixed
 * order — which of them happen depends on whether a move missed — so a test
 * that needs one specific outcome passes a constant rather than a sequence.
 */
export function resolveTurn(
  state: BattleState,
  moveIndex: number,
  random: () => number = Math.random,
): Turn {
  if (state.outcome) return { next: state, events: [] }

  const picks: Record<Side, { move: BattleMove; slot: number | null }> = {
    player: pickFrom(state.player, moveIndex),
    foe: pickFrom(state.foe, chooseFoeMove(state, random)),
  }

  const sides: Record<Side, Fighter> = { player: state.player, foe: state.foe }
  const first = firstMover(state, picks.player.move, picks.foe.move, random)
  const events: BattleEvent[] = []

  const order = [first, other(first)] as const
  let downed = false

  for (const side of order) {
    // Knocked out by the attack that opened this turn.
    if (sides[side].hp === 0) continue

    const { acts, next, blocked, cured } = attempt(sides[side], random)
    sides[side] = { ...sides[side], ...next }
    if (cured) events.push({ kind: 'cured', side, status: cured })
    if (!acts) {
      // Checked before the move is spent, so a blocked turn costs no PP.
      events.push({ kind: 'blocked', side, status: blocked! })
      continue
    }

    const { move, slot } = picks[side]
    sides[side] = spend(sides[side], slot)
    events.push({ kind: 'use', side, move: move.name })

    if (!landsHit(move, random)) {
      events.push({ kind: 'miss', side })
      continue
    }

    const target = other(side)
    const { damage, effectiveness, critical } = damageOf(sides[side], sides[target], move, random)
    events.push({ kind: 'hit', side, damage, effectiveness, critical })

    const hp = Math.max(0, sides[target].hp - damage)
    sides[target] = { ...sides[target], hp }

    if (hp === 0) {
      events.push({ kind: 'faint', side: target })
      downed = true
      break
    }

    // A condition only lands on a target that has none: they do not stack, and
    // the games do not replace one with another.
    if (move.ailment && sides[target].status === null && random() * 100 < move.ailmentChance) {
      sides[target] = {
        ...sides[target],
        status: move.ailment,
        sleepTurns: move.ailment === 'sleep' ? sleepFor(random) : 0,
      }
      events.push({ kind: 'afflicted', side: target, status: move.ailment })
    }
  }

  // The end of the turn: conditions bite, items give back. Skipped entirely
  // once someone has dropped — a fainted Pokémon takes no burn damage.
  if (!downed) {
    for (const side of order) {
      const fighter = sides[side]
      if (fighter.hp === 0) continue

      const bite = residual(fighter.status, fighter.stats.hp)
      if (bite > 0 && fighter.status) {
        const hp = Math.max(0, fighter.hp - bite)
        sides[side] = { ...sides[side], hp }
        events.push({ kind: 'residual', side, status: fighter.status, damage: bite })
        if (hp === 0) {
          events.push({ kind: 'faint', side })
          continue
        }
      }

      const healed = itemHeal(sides[side].item, fighter.stats.hp)
      if (healed > 0 && sides[side].hp < fighter.stats.hp) {
        const hp = Math.min(fighter.stats.hp, sides[side].hp + healed)
        events.push({ kind: 'heal', side, amount: hp - sides[side].hp })
        sides[side] = { ...sides[side], hp }
      }
    }
  }

  const outcome = sides.foe.hp === 0 ? 'won' : sides.player.hp === 0 ? 'lost' : null
  return { next: { ...sides, turn: outcome ? state.turn : state.turn + 1, outcome }, events }
}
