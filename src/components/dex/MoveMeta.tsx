import type { Move } from 'pokenode-ts'
import { humanize } from '@/lib/format'

/** What the move does beyond damage. Rows with nothing to say are dropped. */
export function MoveMeta({ move }: { move: Move }) {
  const meta = move.meta
  if (!meta) return null

  const span = (min: number | null, max: number | null) =>
    min === null || max === null ? null : min === max ? String(min) : `${min}–${max}`

  const rows = [
    ['Category', humanize(meta.category.name)],
    ['Ailment', meta.ailment.name === 'none' ? null : humanize(meta.ailment.name)],
    ['Ailment chance', meta.ailment_chance > 0 ? `${meta.ailment_chance}%` : null],
    ['Flinch chance', meta.flinch_chance > 0 ? `${meta.flinch_chance}%` : null],
    ['Crit rate', meta.crit_rate > 0 ? `+${meta.crit_rate}` : null],
    // One field, two meanings: the endpoint signs recoil as negative drain.
    ['Drain', meta.drain > 0 ? `${meta.drain}%` : null],
    ['Recoil', meta.drain < 0 ? `${Math.abs(meta.drain)}%` : null],
    ['Healing', meta.healing !== 0 ? `${meta.healing}%` : null],
    ['Hits', span(meta.min_hits, meta.max_hits)],
    ['Turns', span(meta.min_turns, meta.max_turns)],
  ] as const

  const shown = rows.filter(([, value]) => value !== null)

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">In battle</h2>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {shown.map(([label, value]) => (
          <div key={label} className="col-span-2 flex items-center justify-between">
            <dt className="text-micro uppercase text-ink-lo">{label}</dt>
            <dd className="text-ink-hi">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
