import { queryOptions } from '@tanstack/react-query'
import { resourceId, type Pokemon } from 'pokenode-ts'
import { scoped } from '../client'

export interface ItemEntry {
  id: number
  name: string
}

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

/**
 * Every item the API knows, walked once.
 *
 * Four pages at this size, and the result backs the item list's filter for the
 * rest of the session. The pocket and category each row belongs to are read off
 * `allItemCategoriesQuery` rather than resolved per item.
 */
export const itemIndexQuery = queryOptions({
  queryKey: ['item-index'],
  staleTime: Infinity,
  queryFn: async ({ signal }): Promise<ItemEntry[]> => {
    const entries: ItemEntry[] = []
    for await (const link of scoped(signal).item.paginate('listItems', { pageSize: 500 })) {
      entries.push({ id: resourceId(link), name: link.name })
    }
    return entries.sort((a, b) => a.id - b.id)
  },
})

/**
 * Every item category, each carrying its pocket and the items in it.
 *
 * The same trade the move list makes with its types and damage classes. The
 * item list endpoint gives a name and nothing else, so labelling two thousand
 * rows from the item side is two thousand requests; from this side it is the
 * fifty-odd categories, once, and each one names the pocket it sits in.
 */
export const allItemCategoriesQuery = queryOptions({
  queryKey: ['item-categories'],
  staleTime: Infinity,
  queryFn: async ({ signal }) => {
    const client = scoped(signal)
    const { results } = await client.item.listItemCategories(0, 100)
    return client.resolveAll(results)
  },
})

export const itemQuery = (name: string) =>
  queryOptions({
    queryKey: ['item', name],
    queryFn: ({ signal }) => scoped(signal).item.getItemByName(name),
  })
