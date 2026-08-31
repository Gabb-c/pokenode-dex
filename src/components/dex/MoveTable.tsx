import { Link } from '@tanstack/react-router'
import type { LearnedMove } from '@/api/queries/moves'
import { TypeChip } from './TypeChip'
import { humanize } from '@/lib/format'
import { useLocalized } from '@/hooks/use-language'

/** The docs say a move with no base power is `0`; the endpoint sends `null`. Both mean none. */
function figure(value: number | null): string {
  return value === null || value === 0 ? '—' : String(value)
}

export function MoveTable({ moves }: { moves: readonly LearnedMove[] }) {
  // Every method but level-up reports level 0, and a column of dashes says nothing.
  const showLevel = moves.some((entry) => entry.level > 0)

  return (
    // Every picker change re-suspends this table, so its own mount is the swap.
    // A scrollable region needs a name and a way in that is not a drag.
    <div
      tabIndex={0}
      role="region"
      aria-label="Learnset"
      className="fade-in overflow-x-auto overscroll-x-contain"
    >
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
            {/*
             * Seven columns is 385px of unbreakable content on a 358px phone, and
             * a table that scrolls sideways inside a column that scrolls down is
             * a bad trade on touch. Class and accuracy are the two a learnset is
             * least often read for, so they wait for the width to appear — the
             * move's own page carries every figure either way.
             */}
            <th scope="col" className="hidden p-2 text-left sm:table-cell">
              Class
            </th>
            <th scope="col" className="p-2 text-right">
              Power
            </th>
            <th scope="col" className="hidden p-2 text-right sm:table-cell">
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
      <td className="hidden p-2 text-ink-mid sm:table-cell">
        {move.damage_class ? humanize(move.damage_class.name) : '—'}
      </td>
      <td className="p-2 text-right text-ink-mid" data-numeric>
        {figure(move.power)}
      </td>
      <td className="hidden p-2 text-right text-ink-mid sm:table-cell" data-numeric>
        {figure(move.accuracy)}
      </td>
      <td className="p-2 text-right text-ink-mid" data-numeric>
        {figure(move.pp)}
      </td>
    </tr>
  )
}
