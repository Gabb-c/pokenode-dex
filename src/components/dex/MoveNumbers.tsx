import type { Move } from 'pokenode-ts'
import { humanize } from '@/lib/format'

/** A move with no power or accuracy reports `null`, and sometimes `0`. */
function figure(value: number | null): string {
  return value === null || value === 0 ? '—' : String(value)
}

export function MoveNumbers({ move }: { move: Move }) {
  const rows = [
    ['Power', figure(move.power)],
    ['Accuracy', figure(move.accuracy)],
    ['PP', figure(move.pp)],
    ['Priority', String(move.priority)],
    ['Target', humanize(move.target.name)],
  ] as const

  return (
    <dl className="panel divide-y divide-line">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between px-4 py-2">
          <dt className="text-micro uppercase text-ink-lo">{label}</dt>
          <dd className="text-sm text-ink-hi" data-numeric={label === 'Target' ? undefined : ''}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
