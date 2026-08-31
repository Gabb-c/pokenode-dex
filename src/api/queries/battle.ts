import { queryOptions } from '@tanstack/react-query'
import type { Pokemon } from 'pokenode-ts'
import { scoped } from '../client'
import { battleMoveset, type BattleMove } from '@/lib/battle-moveset'
import { defaultVersionGroup, learnsetEntries } from '@/lib/learnset'

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
