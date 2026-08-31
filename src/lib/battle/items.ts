import type { BattleMove } from '@/lib/battle/moveset'
import type { TypeName } from '@/lib/types'

/**
 * What a held item does in a duel.
 *
 * Every field is optional and an item may carry more than one, but none of the
 * ones listed here does.
 */
export interface Held {
  /** Multiplies damage from every move. */
  power?: number
  /** Multiplies damage from moves of one class only. */
  boosts?: { class: 'physical' | 'special'; power: number }
  /** Multiplies damage from moves of one type only. */
  tints?: { type: TypeName; power: number }
  /** Share of max HP restored at the end of each turn. */
  heal?: number
}

export interface HeldItem extends Held {
  name: string
}

/** Gen VI onwards, where the type-boosting items settled at a fifth. */
const TYPE_BOOST = 1.2

function tint(type: TypeName): Held {
  return { tints: { type, power: TYPE_BOOST } }
}

/**
 * An allowlist, deliberately.
 *
 * Most of the two thousand items do nothing a duel can see, and several of the
 * ones that do need machinery this tier has not got — a Focus Sash needs a
 * survived-a-hit check, a berry needs a threshold trigger. An item that is not
 * listed here is inert rather than guessed at.
 */
const ITEMS: Record<string, Held> = {
  'life-orb': { power: 1.3 },
  'choice-band': { boosts: { class: 'physical', power: 1.5 } },
  'choice-specs': { boosts: { class: 'special', power: 1.5 } },
  'muscle-band': { boosts: { class: 'physical', power: 1.1 } },
  'wise-glasses': { boosts: { class: 'special', power: 1.1 } },
  leftovers: { heal: 1 / 16 },

  charcoal: tint('fire'),
  'mystic-water': tint('water'),
  'miracle-seed': tint('grass'),
  magnet: tint('electric'),
  'never-melt-ice': tint('ice'),
  'black-belt': tint('fighting'),
  'poison-barb': tint('poison'),
  'soft-sand': tint('ground'),
  'sharp-beak': tint('flying'),
  'twisted-spoon': tint('psychic'),
  'silver-powder': tint('bug'),
  'hard-stone': tint('rock'),
  'spell-tag': tint('ghost'),
  'dragon-fang': tint('dragon'),
  'black-glasses': tint('dark'),
  'metal-coat': tint('steel'),
  'silk-scarf': tint('normal'),
  'fairy-feather': tint('fairy'),
}

/** The item a fighter is carrying, if this tier knows what it does. */
export function heldItem(name: string): HeldItem | undefined {
  const held = ITEMS[name]
  return held ? { ...held, name } : undefined
}

/** What the item multiplies this move's damage by. Everything it does not touch is 1. */
export function itemMultiplier(item: HeldItem | null | undefined, move: BattleMove): number {
  if (!item) return 1

  let multiplier = item.power ?? 1
  if (item.boosts?.class === move.damageClass) multiplier *= item.boosts.power
  if (item.tints?.type === move.type) multiplier *= item.tints.power
  return multiplier
}

/** What the item restores at the end of a turn. A heal that lands always gives a point. */
export function itemHeal(item: HeldItem | null | undefined, maxHp: number): number {
  return item?.heal ? Math.max(1, Math.floor(maxHp * item.heal)) : 0
}
