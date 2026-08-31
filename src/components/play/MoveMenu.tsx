import { TypeChip } from '@/components/dex/TypeChip'
import type { BattleMove } from '@/lib/battle-moveset'
import { humanize } from '@/lib/format'

interface MoveMenuProps {
  moves: readonly BattleMove[]
  /** True while a turn is playing out; nothing is selectable until it lands. */
  busy: boolean
  onPick: (index: number) => void
}

/*
 * `aria-disabled` rather than `disabled`: a locked slot keeps its place in the
 * tab order, so a keyboard player is not thrown back to the top of the menu
 * every time a turn plays out. `pointer-events-none` is what stops the hover,
 * and the handlers guard the click the attribute no longer blocks.
 */
const ACTION =
  'well w-full px-3 py-2 text-left transition-colors hover:border-line-strong aria-disabled:pointer-events-none aria-disabled:opacity-50'

export function MoveMenu({ moves, busy, onPick }: MoveMenuProps) {
  // Four dead buttons would be a dead end, so a Pokémon with nothing left is
  // offered the move the engine substitutes for it anyway.
  const spent = moves.every((move) => move.pp === 0)

  if (spent) {
    return (
      <button
        type="button"
        aria-disabled={busy}
        onClick={() => !busy && onPick(0)}
        className={ACTION}
      >
        <span className="text-sm text-ink-hi">Struggle</span>
        <span className="ml-2 text-micro uppercase text-ink-lo">Nothing left to use</span>
      </button>
    )
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {/* Padded slots repeat a name, so the index is part of the key. */}
      {moves.map((move, index) => {
        const locked = busy || move.pp === 0

        return (
          <li key={`${move.name}-${index}`}>
            <button
              type="button"
              aria-disabled={locked}
              onClick={() => !locked && onPick(index)}
              className={`${ACTION} flex items-center justify-between gap-3`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <TypeChip name={move.type} asLink={false} />
                <span className="truncate text-sm text-ink-hi">{humanize(move.name)}</span>
              </span>
              <span className="shrink-0 text-micro uppercase text-ink-lo">
                PP{' '}
                <output data-numeric>
                  {move.pp}/{move.maxPp}
                </output>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
