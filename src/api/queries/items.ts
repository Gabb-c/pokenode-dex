import { queryOptions } from '@tanstack/react-query'
import type { Pokemon } from 'pokenode-ts'
import { scoped } from '../client'

/**
 * The items a Pokémon is found holding.
 *
 * Most hold nothing, so the caller checks `held_items` before mounting this —
 * an empty `resolveAll` would still cost a render and a query entry.
 */
export const heldItemsQuery = (pokemon: Pokemon) =>
  queryOptions({
    queryKey: ['held-items', pokemon.name],
    staleTime: Infinity,
    queryFn: ({ signal }) =>
      scoped(signal).resolveAll(pokemon.held_items.map((held) => held.item)),
  })
