import { queryOptions } from '@tanstack/react-query'
import type { Move } from 'pokenode-ts'
import { scoped } from '../client'

/**
 * What a move is worth in a contest.
 *
 * `contest_effect` is an `APIResource` — a bare URL with no name on it, because
 * the endpoint it points at has no slug to give. `resolve` follows it exactly
 * as it follows a named link, and the appeal and jam figures come back typed.
 */
export const contestEffectQuery = (move: Move) =>
  queryOptions({
    queryKey: ['contest-effect', move.name],
    staleTime: Infinity,
    queryFn: ({ signal }) =>
      // Not `undefined`: Query rejects that as a missing result.
      move.contest_effect ? scoped(signal).resolve(move.contest_effect) : null,
  })

/** The super contest half of the same pairing, and the same unnamed link. */
export const superContestEffectQuery = (move: Move) =>
  queryOptions({
    queryKey: ['super-contest-effect', move.name],
    staleTime: Infinity,
    queryFn: ({ signal }) =>
      move.super_contest_effect ? scoped(signal).resolve(move.super_contest_effect) : null,
  })

/** The five contest types, for the label a move's contest panel carries. */
export const contestTypesQuery = queryOptions({
  queryKey: ['contest-types'],
  staleTime: Infinity,
  queryFn: async ({ signal }) => {
    const client = scoped(signal)
    const { results } = await client.contest.listContestTypes(0, 20)
    return client.resolveAll(results)
  },
})
