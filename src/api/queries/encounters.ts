import { queryOptions } from '@tanstack/react-query'
import { scoped } from '../client'

/**
 * Where a Pokémon is found in the wild, for every game at once.
 *
 * One request covers every version, so the picker below the table costs
 * nothing: the endpoint returns the areas already grouped by version, and the
 * rows are folded out of that payload rather than fetched per game.
 *
 * `staleTime: Infinity` for the same reason as the other reference queries —
 * a shipped game's encounter table does not move.
 */
export const encountersQuery = (id: number) =>
  queryOptions({
    queryKey: ['encounters', id],
    staleTime: Infinity,
    queryFn: ({ signal }) => scoped(signal).pokemon.getPokemonLocationAreaById(id),
  })
