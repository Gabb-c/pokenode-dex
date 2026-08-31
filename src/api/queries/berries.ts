import { queryOptions } from '@tanstack/react-query'
import { resourceId } from 'pokenode-ts'
import { scoped } from '../client'

export interface BerryEntry {
  id: number
  name: string
}

/**
 * Every berry the API knows, walked once.
 *
 * The same shape as the dex and move indexes: `paginate` owns the offset, and
 * the sixty-odd entries it returns back the list's filter without a further
 * request. The flavours each one carries are read off `berryFlavorsQuery`
 * rather than resolved here.
 */
export const berryIndexQuery = queryOptions({
  queryKey: ['berry-index'],
  staleTime: Infinity,
  queryFn: async ({ signal }): Promise<BerryEntry[]> => {
    const entries: BerryEntry[] = []
    for await (const link of scoped(signal).berry.paginate('listBerries', { pageSize: 100 })) {
      entries.push({ id: resourceId(link), name: link.name })
    }
    return entries.sort((a, b) => a.id - b.id)
  },
})

/**
 * The five flavours, each carrying the berries that taste of it.
 *
 * The same trade the move list makes with its types and damage classes: the
 * berry list endpoint gives a name and nothing else, so showing a flavour
 * beside each row would cost one request per berry. Both sides of the link
 * carry the pairing, and this is the cheap side — five resources for the whole
 * grid.
 */
export const berryFlavorsQuery = queryOptions({
  queryKey: ['berry-flavors'],
  staleTime: Infinity,
  queryFn: async ({ signal }) => {
    const client = scoped(signal)
    const { results } = await client.berry.listBerryFlavors(0, 20)
    return client.resolveAll(results)
  },
})

/** The five firmnesses, each carrying its berries — read backwards like the flavours. */
export const berryFirmnessesQuery = queryOptions({
  queryKey: ['berry-firmnesses'],
  staleTime: Infinity,
  queryFn: async ({ signal }) => {
    const client = scoped(signal)
    const { results } = await client.berry.listBerryFirmnesses(0, 20)
    return client.resolveAll(results)
  },
})

export const berryQuery = (name: string) =>
  queryOptions({
    queryKey: ['berry', name],
    queryFn: ({ signal }) => scoped(signal).berry.getBerryByName(name),
  })
