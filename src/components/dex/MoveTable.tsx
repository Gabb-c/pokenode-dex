import { Link } from '@tanstack/react-router'
import type { LearnedMove } from '@/api/queries/moves'
import { TypeChip } from './TypeChip'
import { humanize } from '@/lib/format'
import { useLocalized } from '@/lib/language'

/** The docs say a move with no base power is `0`; the endpoint sends `null`. Both mean none. */
function figure(value: number | null): string {
  return value === null || value === 0 ? '—' : String(value)
}

export function MoveTable({ moves }: { moves: readonly LearnedMove[] }) {
  // Every method but level-up reports level 0, and a column of dashes says nothing.
  const showLevel = moves.some((entry) => entry.level > 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="text-micro uppercase text-ink-lo">
            {showLevel && (
              <th scope="col" className="p-2 text-right">
                Lv
              </th>
            )}
            <th scope="col" className="p-2 text-left">
              Move
            </th>
            <th scope="col" className="p-2 text-left">
              Type
            </th>
            <th scope="col" className="p-2 text-left">
              Class
            </th>
            <th scope="col" className="p-2 text-right">
              Power
            </th>
            <th scope="col" className="p-2 text-right">
              Acc.
            </th>
            <th scope="col" className="p-2 text-right">
              PP
            </th>
          </tr>
        </thead>
        <tbody>
          {moves.map((entry) => (
            <MoveRow key={entry.move.id} entry={entry} showLevel={showLevel} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MoveRow({ entry, showLevel }: { entry: LearnedMove; showLevel: boolean }) {
  const { move } = entry
  const name = useLocalized(move.names)?.name ?? humanize(move.name)

  return (
    <tr className="border-t border-line">
      {/* The column is only shown for a level-up list, where 0 means on evolution. */}
      {showLevel && (
        <td className="p-2 text-right text-ink-lo" data-numeric>
          {entry.level === 0 ? 'Evo.' : entry.level}
        </td>
      )}
      <td className="p-2">
        <Link
          to="/moves/$name"
          params={{ name: move.name }}
          className="text-ink-hi hover:text-accent"
        >
          {name}
        </Link>
      </td>
      <td className="p-2">
        <TypeChip name={move.type.name} />
      </td>
      {/* Spelled out rather than colour-coded: the class is the row's only other axis. */}
      <td className="p-2 text-ink-mid">
        {move.damage_class ? humanize(move.damage_class.name) : '—'}
      </td>
      <td className="p-2 text-right text-ink-mid" data-numeric>
        {figure(move.power)}
      </td>
      <td className="p-2 text-right text-ink-mid" data-numeric>
        {figure(move.accuracy)}
      </td>
      <td className="p-2 text-right text-ink-mid" data-numeric>
        {figure(move.pp)}
      </td>
    </tr>
  )
}
