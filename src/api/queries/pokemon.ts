import { queryOptions } from '@tanstack/react-query'
import type { Pokemon } from 'pokenode-ts'
import { scoped } from '../client'

export const pokemonQuery = (name: string) =>
  queryOptions({
    queryKey: ['pokemon', name],
    queryFn: ({ signal }) => scoped(signal).pokemon.getPokemonByName(name),
  })

/**
 * The species behind a Pokémon, followed from the link rather than looked up by
 * name: a form like `deoxys-attack` belongs to the species `deoxys`, so the two
 * names do not always match.
 */
export const speciesQuery = (pokemon: Pokemon) =>
  queryOptions({
    queryKey: ['species', pokemon.species.name],
    queryFn: ({ signal }) => scoped(signal).resolve(pokemon.species),
  })
