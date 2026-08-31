import { queryOptions } from '@tanstack/react-query'
import type { Location } from 'pokenode-ts'
import { scoped } from '../client'

/**
 * The regions, resolved.
 *
 * Ten of them, and each carries every location in it — so the region page below
 * costs one further request rather than a walk of the two-thousand-entry
 * location list.
 */
export const regionsQuery = queryOptions({
  queryKey: ['regions'],
  staleTime: Infinity,
  queryFn: async ({ signal }) => {
    const client = scoped(signal)
    const { results } = await client.location.listRegions(0, 100)
    return client.resolveAll(results)
  },
})

export const regionQuery = (name: string) =>
  queryOptions({
    queryKey: ['region', name],
    staleTime: Infinity,
    queryFn: ({ signal }) => scoped(signal).location.getRegionByName(name),
  })

export const locationQuery = (name: string) =>
  queryOptions({
    queryKey: ['location', name],
    staleTime: Infinity,
    queryFn: ({ signal }) => scoped(signal).location.getLocationByName(name),
  })

/**
 * The areas of one location, with their encounter tables.
 *
 * A location names its areas and an area carries every Pokémon found in it, so
 * this is the encounters panel read from the other end: the Pokémon page asks
 * where one species lives, and this asks what lives in one place. Most
 * locations have a handful of areas, which is what keeps `resolveAll` cheap
 * here.
 */
export const locationAreasQuery = (location: Location) =>
  queryOptions({
    queryKey: ['location-areas', location.name],
    staleTime: Infinity,
    queryFn: ({ signal }) => scoped(signal).resolveAll(location.areas),
  })
