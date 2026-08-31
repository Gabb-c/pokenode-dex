import { queryOptions } from '@tanstack/react-query'
import { resourceId, type Move, type Pokemon } from 'pokenode-ts'
import { scoped } from '../client'
import { learnsetEntries, versionGroupOrder } from '@/lib/learnset'

export interface LearnedMove {
  move: Move
  level: number
}

export interface MoveEntry {
  id: number
  name: string
}

/**
 * What a Pokémon learns in one version group, by one method.
 *
 * A Pokémon carries its whole learnset as unresolved links — several hundred of
 * them for a modern one — so the work is choosing which to follow. Narrowing to
 * a single tab first keeps `resolveAll` to the twenty or so rows on screen, and
 * its concurrency cap keeps even the machine tab a trickle rather than a
 * fan-out.
 *
 * `staleTime: Infinity` for the same reason as the other reference queries: a
 * shipped game's learnset is not going to change.
 */
export const learnsetQuery = (pokemon: Pokemon, versionGroup: string, method: string) =>
  queryOptions({
    queryKey: ['learnset', pokemon.name, versionGroup, method],
    staleTime: Infinity,
    queryFn: async ({ signal }): Promise<LearnedMove[]> => {
      const entries = learnsetEntries(pokemon.moves, versionGroup, method)
      const moves = await scoped(signal).resolveAll(entries.map((entry) => entry.link))
      return moves.map((move, index) => ({ move, level: entries[index].level }))
    },
  })

/**
 * Every move the API knows, walked once.
 *
 * The same shape as the dex's search index: `paginate` owns the offset, and the
 * result backs the move list's filter without touching the network again.
 */
export const moveIndexQuery = queryOptions({
  queryKey: ['move-index'],
  staleTime: Infinity,
  queryFn: async ({ signal }): Promise<MoveEntry[]> => {
    const entries: MoveEntry[] = []
    for await (const link of scoped(signal).move.paginate('listMoves', { pageSize: 500 })) {
      entries.push({ id: resourceId(link), name: link.name })
    }
    return entries.sort((a, b) => a.id - b.id)
  },
})

export const moveQuery = (name: string) =>
  queryOptions({
    queryKey: ['move', name],
    queryFn: ({ signal }) => scoped(signal).move.getMoveByName(name),
  })

/**
 * The three damage classes, each carrying the moves that fall into it.
 *
 * The list endpoint gives a move's name and nothing else, so a list of a
 * thousand moves would need a thousand requests to show a type and a class
 * beside each. Both facts are already on the other side of the link: the
 * eighteen types come from `allTypesQuery`, and this is the other three
 * resources. Two cached queries, and the whole grid is local.
 */
export const allDamageClassesQuery = queryOptions({
  queryKey: ['damage-classes'],
  staleTime: Infinity,
  queryFn: async ({ signal }) => {
    const client = scoped(signal)
    const { results } = await client.move.listMoveDamageClasses(0, 20)
    return client.resolveAll(results)
  },
})

/**
 * The TM a move is taught by, in the newest game that has one.
 *
 * A move carries one machine per version group and they are almost always the
 * same number, so following the newest is one request where following them all
 * would be a dozen. The link is an unnamed `APIResource`, which `resolve`
 * handles the same way as a named one.
 */
export const machineQuery = (move: Move) =>
  queryOptions({
    queryKey: ['machine', move.name],
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const newest = [...move.machines].sort(
        (a, b) =>
          versionGroupOrder(b.version_group.name) - versionGroupOrder(a.version_group.name),
      )[0]
      // Not `undefined`: Query rejects that as a missing result.
      if (!newest) return null
      return scoped(signal).resolve(newest.machine)
    },
  })
