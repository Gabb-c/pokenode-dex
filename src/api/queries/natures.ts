import { queryOptions } from '@tanstack/react-query'
import { scoped } from '../client'

/**
 * The twenty-five natures, each with the stat it raises and the one it drops.
 *
 * Resolved rather than listed because the list carries names alone and the
 * modifiers are the whole point. Held for the session — a nature's effect is
 * not going to change — and only fetched when the stat calculator is opened.
 */
export const allNaturesQuery = queryOptions({
  queryKey: ['all-natures'],
  staleTime: Infinity,
  queryFn: async ({ signal }) => {
    const client = scoped(signal)
    const { results } = await client.pokemon.listNatures(0, 50)
    return client.resolveAll(results)
  },
})
