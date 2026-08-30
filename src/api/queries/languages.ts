import { queryOptions } from '@tanstack/react-query'
import { scoped } from '../client'

/** The languages the PokéAPI publishes text in. */
export const languagesQuery = queryOptions({
  queryKey: ['languages'],
  staleTime: Infinity,
  queryFn: async ({ signal }) => {
    const { results } = await scoped(signal).utility.listLanguages(0, 100)
    return results
  },
})
