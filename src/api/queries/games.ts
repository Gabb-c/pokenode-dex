import { queryOptions } from '@tanstack/react-query'
import { resourceId } from 'pokenode-ts'
import { scoped } from '../client'

/** The generations, for the dex filter. */
export const generationsQuery = queryOptions({
  queryKey: ['generations'],
  staleTime: Infinity,
  queryFn: async ({ signal }) => {
    const { results } = await scoped(signal).game.listGenerations(0, 100)
    return results
  },
})

/**
 * The species ids a generation introduced.
 *
 * Species rather than Pokémon, which is what the endpoint carries — so an
 * alternate form is not counted as its own dex entry here.
 */
export const generationMembersQuery = (name: string) =>
  queryOptions({
    queryKey: ['generation-members', name],
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const generation = await scoped(signal).game.getGenerationByName(name)
      return new Set(generation.pokemon_species.map((link) => resourceId(link)))
    },
  })

/** Every Pokédex the API publishes, for the games index. */
export const pokedexesQuery = queryOptions({
  queryKey: ['pokedexes'],
  staleTime: Infinity,
  queryFn: async ({ signal }) => {
    const { results } = await scoped(signal).game.listPokedexes(0, 100)
    return results
  },
})

/**
 * One regional Pokédex, entries and all.
 *
 * A single request carries every species the dex catalogues along with the
 * number it gave them, so the grid beneath costs nothing further: the cards are
 * built from these links and `getPokemonSpriteUrl`.
 */
export const pokedexQuery = (name: string) =>
  queryOptions({
    queryKey: ['pokedex', name],
    staleTime: Infinity,
    queryFn: ({ signal }) => scoped(signal).game.getPokedexByName(name),
  })
