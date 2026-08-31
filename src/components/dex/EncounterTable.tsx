import type { EncounterRow } from '@/lib/encounters'
import { humanize } from '@/lib/format'

/** A den can be gated behind a dozen flags, and the list stops being readable. */
const NAMED_CONDITIONS = 3

/** `3` when a slot has one level, `3–5` when it spans. */
function levels(row: EncounterRow): string {
  return row.minLevel === row.maxLevel ? String(row.minLevel) : `${row.minLevel}–${row.maxLevel}`
}

function conditions(row: EncounterRow): string {
  if (row.conditions.length === 0) return '—'

  const named = row.conditions.slice(0, NAMED_CONDITIONS).map(humanize).join(', ')
  const rest = row.conditions.length - NAMED_CONDITIONS
  return rest > 0 ? `${named} +${rest}` : named
}

export function EncounterTable({ rows }: { rows: readonly EncounterRow[] }) {
  const conditional = rows.some((row) => row.conditions.length > 0)

  return (
    // Keyed on the version by its caller: the rows are filtered client-side, so
    // nothing here would otherwise remount when the picker moves.
    // A scrollable region needs a name and a way in that is not a drag.
    <div
      tabIndex={0}
      role="region"
      aria-label="Encounters"
      className="fade-in overflow-x-auto overscroll-x-contain"
    >
      {/*
       * `min-w-max` only from `sm`. Area names run to "Kanto Route 2 South
       * Towards Viridian City", and holding every one of them on a single line
       * turns a phone's whole encounter panel into a sideways scroll. Below that
       * the cells wrap instead, which costs height and keeps all five columns.
       */}
      <table className="w-full border-collapse text-sm sm:min-w-max">
        <thead>
          <tr className="text-micro uppercase text-ink-lo">
            <th scope="col" className="min-w-32 p-2 text-left">
              Where
            </th>
            <th scope="col" className="p-2 text-left">
              How
            </th>
            <th scope="col" className="p-2 text-right">
              Levels
            </th>
            <th scope="col" className="p-2 text-right">
              Chance
            </th>
            {/* Most games gate nothing, and a column of dashes says nothing. */}
            {conditional && (
              <th scope="col" className="p-2 text-left">
                Only when
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.area.name}/${row.method}`} className="border-t border-line">
              {/* Area and method names are read off the links: resolving each one
                  would turn a single request into dozens, for text the API
                  leaves untranslated anyway. */}
              <td className="p-2 text-ink-hi">{humanize(row.area.name)}</td>
              <td className="p-2 text-ink-mid">{humanize(row.method)}</td>
              <td className="p-2 text-right text-ink-mid" data-numeric>
                {levels(row)}
              </td>
              <td className="p-2 text-right text-ink-mid" data-numeric>
                {row.chance}%
              </td>
              {conditional && <td className="p-2 text-ink-lo">{conditions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
