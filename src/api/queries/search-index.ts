import { queryOptions } from '@tanstack/react-query'
import { resourceId } from 'pokenode-ts'
import { scoped } from '../client'

export interface DexEntry {
  id: number
  name: string
}

/**
 * Every Pokémon the API knows, walked once.
 *
 * `paginate` manages the offset and the limit itself, so this is the whole of
 * the traversal. The result backs the command palette and the filters, which
 * both need the full set in memory to answer instantly.
 */
export const searchIndexQuery = queryOptions({
  queryKey: ['search-index'],
  staleTime: Infinity,
  queryFn: async ({ signal }): Promise<DexEntry[]> => {
    const entries: DexEntry[] = []
    for await (const link of scoped(signal).pokemon.paginate('listPokemons', { pageSize: 500 })) {
      entries.push({ id: resourceId(link), name: link.name })
    }
    return entries.sort((a, b) => a.id - b.id)
  },
})
