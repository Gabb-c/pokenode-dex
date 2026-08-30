import { queryOptions } from '@tanstack/react-query'
import { defensiveProfileFrom, resourceId, type Pokemon } from 'pokenode-ts'
import { scoped } from '../client'
import { isBattleType } from '@/lib/types'

export const typeQuery = (name: string) =>
  queryOptions({
    queryKey: ['type', name],
    queryFn: ({ signal }) => scoped(signal).pokemon.getTypeByName(name),
  })

/**
 * What every attacking type does to this Pokémon.
 *
 * `resolveAll` follows the type links the Pokémon already carries, so the whole
 * matchup is one cached query rather than a fan-out the component has to
 * orchestrate. Concurrency is capped by the library, which keeps a dual type to
 * two requests and the full chart to a polite trickle.
 */
export const matchupsQuery = (pokemon: Pokemon) =>
  queryOptions({
    queryKey: ['matchups', pokemon.name],
    queryFn: async ({ signal }) => {
      const types = await scoped(signal).resolveAll(pokemon.types.map((slot) => slot.type))
      return defensiveProfileFrom(types)
    },
  })

/**
 * Every battle type, for the effectiveness chart.
 *
 * Listing first and resolving the links keeps the result typed as `Type[]` —
 * a bare URL string carries nothing for `resolveAll` to infer from.
 */
export const allTypesQuery = queryOptions({
  queryKey: ['all-types'],
  staleTime: Infinity,
  queryFn: async ({ signal }) => {
    const client = scoped(signal)
    const { results } = await client.pokemon.listTypes(0, 100)
    return client.resolveAll(results.filter((link) => isBattleType(link.name)))
  },
})

/** The Pokémon ids of one type, for the dex filter. */
export const typeMembersQuery = (name: string) =>
  queryOptions({
    queryKey: ['type-members', name],
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const type = await scoped(signal).pokemon.getTypeByName(name)
      return new Set(type.pokemon.map((entry) => resourceId(entry.pokemon)))
    },
  })
