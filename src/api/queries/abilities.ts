import { queryOptions } from '@tanstack/react-query'
import type { Pokemon } from 'pokenode-ts'
import { scoped } from '../client'

/**
 * The abilities a Pokémon carries as links, resolved for their effect text.
 *
 * Two or three links, so the whole panel is one query — the slugs are already
 * in the Pokémon payload and render before this settles.
 */
export const abilitiesQuery = (pokemon: Pokemon) =>
  queryOptions({
    queryKey: ['abilities', pokemon.name],
    staleTime: Infinity,
    queryFn: ({ signal }) =>
      scoped(signal).resolveAll(pokemon.abilities.map((slot) => slot.ability)),
  })
