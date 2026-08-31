import { queryOptions } from '@tanstack/react-query'
import type { Pokemon } from 'pokenode-ts'
import { scoped } from '../client'
import { heldItem, type HeldItem } from '@/lib/battle/items'
import { battleMoveset, type BattleMove } from '@/lib/battle/moveset'
import { defaultVersionGroup, learnsetEntries } from '@/lib/moves/learnset'

/**
 * How many links one side may follow.
 *
 * A modern Pokémon's level-up list runs to forty-odd moves and the menu needs
 * four of them, so resolving the tab the way the dex's learnset panel does
 * would cost eighty requests to open a duel. The list is already sorted by the
 * level it teaches at, and a move learned late is the one worth bringing, so
 * the tail of it is the only part worth following.
 */
const WINDOW = 8

/**
 * Four moves for a fighter, from what it actually learns.
 *
 * `staleTime: Infinity` for the same reason as the other reference queries: a
 * shipped game's learnset is not going to change. `battleMoveset` pads any slot
 * the window could not fill, so this never fetches a second time to fix one up.
 */
export const battleMovesQuery = (pokemon: Pokemon, level: number) =>
  queryOptions({
    queryKey: ['battle-moves', pokemon.name, level],
    staleTime: Infinity,
    queryFn: async ({ signal }): Promise<BattleMove[]> => {
      const group = defaultVersionGroup(pokemon.moves)
      const entries = group ? learnsetEntries(pokemon.moves, group, 'level-up') : []

      // Nothing in range means everything it knows is taught above the battle
      // level — bring its earliest moves rather than sending it out on struggle.
      const inRange = entries.filter((entry) => entry.level <= level)
      const window = inRange.length > 0 ? inRange.slice(-WINDOW) : entries.slice(0, WINDOW)

      const moves = await scoped(signal).resolveAll(window.map((entry) => entry.link))
      return battleMoveset(moves)
    },
  })

/**
 * What a fighter is carrying.
 *
 * A Pokémon lists the items it is *found* holding in the wild, with a rarity
 * each; the commonest is the one a duel gives it. Most hold nothing, and an
 * item this tier has no rule for is left off rather than guessed at — which is
 * what `heldItem` decides.
 */
export const battleItemQuery = (pokemon: Pokemon) =>
  queryOptions({
    queryKey: ['battle-item', pokemon.name],
    staleTime: Infinity,
    queryFn: async ({ signal }): Promise<HeldItem | null> => {
      const commonest = [...pokemon.held_items].sort(
        (a, b) => rarityOf(b) - rarityOf(a),
      )[0]
      // Not `undefined`: Query rejects that as a missing result.
      if (!commonest) return null

      const item = await scoped(signal).resolve(commonest.item)
      return heldItem(item.name) ?? null
    },
  })

/** The likeliest a hold gets across the versions the endpoint lists. */
function rarityOf(held: Pokemon['held_items'][number]): number {
  return held.version_details.reduce((highest, detail) => Math.max(highest, detail.rarity), 0)
}
