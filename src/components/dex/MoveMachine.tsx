import { useSuspenseQuery } from '@tanstack/react-query'
import type { Move } from 'pokenode-ts'
import { machineQuery } from '@/api/queries/moves'
import { humanize } from '@/lib/format'

/** The TM that teaches this move, in the newest game that has one. */
export function MoveMachine({ move }: { move: Move }) {
  const { data: machine } = useSuspenseQuery(machineQuery(move))
  if (!machine) return null

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Machine</h2>
      <p className="mt-2 text-sm text-ink-hi">
        {machine.item.name.toUpperCase()}
        <span className="ml-2 text-micro text-ink-lo">{humanize(machine.version_group.name)}</span>
      </p>
    </section>
  )
}
