import { queryOptions } from '@tanstack/react-query'
import type { Item } from 'pokenode-ts'
import { scoped } from '../client'

/**
 * Every TM, HM and TR the API knows, in one request.
 *
 * The machine section's only list is unnamed and runs to a couple of thousand
 * entries, none of which carries the move it teaches — so walking it would buy
 * a list of numbers and nothing else. The item side of the same data is one
 * category, and a category names every item in it.
 */
export const machineItemsQuery = queryOptions({
  queryKey: ['machine-items'],
  staleTime: Infinity,
  queryFn: ({ signal }) => scoped(signal).item.getItemCategoryByName('all-machines'),
})

/**
 * The machines behind one TM item — which move it teaches, in which game.
 *
 * `item.machines` points at them by URL alone: an `APIResource` with no name,
 * because a machine has no slug of its own. `resolveAll` follows a list of
 * those the same way it follows named links, and the moves come back typed.
 */
export const itemMachinesQuery = (item: Item) =>
  queryOptions({
    queryKey: ['item-machines', item.name],
    staleTime: Infinity,
    queryFn: ({ signal }) =>
      scoped(signal).resolveAll(item.machines.map((detail) => detail.machine)),
  })
