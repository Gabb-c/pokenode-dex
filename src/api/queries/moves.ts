import { queryOptions } from '@tanstack/react-query'
import type { Move, Pokemon } from 'pokenode-ts'
import { scoped } from '../client'
import { learnsetEntries } from '@/lib/learnset'

export interface LearnedMove {
  move: Move
  level: number
}

/**
 * What a Pokémon learns in one version group, by one method.
 *
 * A Pokémon carries its whole learnset as unresolved links — several hundred of
 * them for a modern one — so the work is choosing which to follow. Narrowing to
 * a single tab first keeps `resolveAll` to the twenty or so rows on screen, and
 * its concurrency cap keeps even the machine tab a trickle rather than a
 * fan-out.
 *
 * `staleTime: Infinity` for the same reason as the other reference queries: a
 * shipped game's learnset is not going to change.
 */
export const learnsetQuery = (pokemon: Pokemon, versionGroup: string, method: string) =>
  queryOptions({
    queryKey: ['learnset', pokemon.name, versionGroup, method],
    staleTime: Infinity,
    queryFn: async ({ signal }): Promise<LearnedMove[]> => {
      const entries = learnsetEntries(pokemon.moves, versionGroup, method)
      const moves = await scoped(signal).resolveAll(entries.map((entry) => entry.link))
      return moves.map((move, index) => ({ move, level: entries[index].level }))
    },
  })
