/** The five conditions this tier models. The games have more; these are the ones a duel meets. */
export type Status = 'burn' | 'poison' | 'paralysis' | 'sleep' | 'freeze'

/** The API's ailment slugs, where one names a condition modelled here. */
const AILMENTS: Record<string, Status> = {
  burn: 'burn',
  poison: 'poison',
  paralysis: 'paralysis',
  sleep: 'sleep',
  freeze: 'freeze',
}

/**
 * `toxic` and `bad-poison` are folded into plain poison: the escalating damage
 * needs a counter of its own, and a duel this short would never show it.
 */
AILMENTS['bad-poison'] = 'poison'

export function statusFrom(ailment: string | undefined): Status | undefined {
  return ailment ? AILMENTS[ailment] : undefined
}

/** Burn takes a sixteenth a turn; poison takes an eighth. */
const RESIDUAL: Partial<Record<Status, number>> = { burn: 1 / 16, poison: 1 / 8 }

const PARALYSIS_CHANCE = 0.25
const THAW_CHANCE = 0.2

/** Sleep lasts one to three turns, decided when it lands. */
const MIN_SLEEP = 1
const MAX_SLEEP = 3

/** How long a fighter has been asleep for, alongside what ails it. */
export interface Afflicted {
  status: Status | null
  /** Turns of sleep left. Meaningless unless `status` is `sleep`. */
  sleepTurns: number
}

export interface Attempt {
  acts: boolean
  next: Afflicted
  /** The condition that stopped the move, where one did. */
  blocked?: Status
  /** Set on the turn the condition lifts, which is worth saying out loud. */
  cured?: Status
}

/**
 * Whether a condition lets the fighter move this turn.
 *
 * Sleep and freeze are checked before the move is spent, so a blocked turn
 * costs no PP — the same order the games resolve them in. `random` is a
 * parameter rather than reached for, so a test pins the outcome.
 */
export function attempt(state: Afflicted, random: () => number = Math.random): Attempt {
  const { status } = state

  if (status === 'sleep') {
    const left = state.sleepTurns - 1
    if (left <= 0) return { acts: true, next: { status: null, sleepTurns: 0 }, cured: 'sleep' }
    return { acts: false, next: { status, sleepTurns: left }, blocked: 'sleep' }
  }

  if (status === 'freeze') {
    if (random() < THAW_CHANCE) {
      return { acts: true, next: { status: null, sleepTurns: 0 }, cured: 'freeze' }
    }
    return { acts: false, next: state, blocked: 'freeze' }
  }

  if (status === 'paralysis' && random() < PARALYSIS_CHANCE) {
    return { acts: false, next: state, blocked: 'paralysis' }
  }

  return { acts: true, next: state }
}

/** What a condition takes at the end of a turn. A tick that lands always costs a point. */
export function residual(status: Status | null, maxHp: number): number {
  const share = status ? RESIDUAL[status] : undefined
  return share ? Math.max(1, Math.floor(maxHp * share)) : 0
}

/** Paralysis halves speed, which is what makes it worth more than a skipped turn. */
export function effectiveSpeed(speed: number, status: Status | null): number {
  return status === 'paralysis' ? Math.floor(speed / 2) : speed
}

/** A burn halves physical damage, and touches nothing else. */
export function burnPenalty(status: Status | null, physical: boolean): number {
  return status === 'burn' && physical ? 0.5 : 1
}

/** How long a fresh sleep lasts. */
export function sleepFor(random: () => number = Math.random): number {
  return MIN_SLEEP + Math.floor(random() * (MAX_SLEEP - MIN_SLEEP + 1))
}
