import { queryOptions } from '@tanstack/react-query'
import type { PokemonSpecies } from 'pokenode-ts'
import { scoped } from '../client'

export const evolutionChainQuery = (species: PokemonSpecies) =>
  queryOptions({
    queryKey: ['evolution-chain', species.evolution_chain.url],
    queryFn: ({ signal }) => scoped(signal).resolve(species.evolution_chain),
  })
