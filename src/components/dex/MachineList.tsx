import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { Item } from 'pokenode-ts'
import { itemMachinesQuery } from '@/api/queries/machines'
import { humanize } from '@/lib/format'

/**
 * The move a machine teaches, per game.
 *
 * `item.machines` points at its records by URL alone — an `APIResource` with no
 * name on it, because a machine has no slug of its own. `resolveAll` follows a
 * list of those the same way it follows named links, and each one names the
 * move and the games it belongs to.
 */
export function MachineList({ item }: { item: Item }) {
  const { data: machines } = useSuspenseQuery(itemMachinesQuery(item))
  if (machines.length === 0) return null

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Teaches</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {machines.map((machine) => (
          <li key={machine.id} className="flex items-baseline justify-between gap-4">
            <Link
              to="/moves/$name"
              params={{ name: machine.move.name }}
              className="text-sm text-accent hover:underline"
            >
              {humanize(machine.move.name)}
            </Link>
            <span className="text-micro uppercase text-ink-lo">
              {humanize(machine.version_group.name)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
