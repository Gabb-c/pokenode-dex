import { useDeferredValue, useMemo, useState } from 'react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useVirtualizer } from '@tanstack/react-virtual'
import { allDamageClassesQuery, moveIndexQuery } from '@/api/queries/moves'
import { allTypesQuery } from '@/api/queries/types'
import { cached } from '@/api/query-client'
import { TypeChip } from '@/components/dex/TypeChip'
import { ErrorState } from '@/components/ui/ErrorState'
import { humanize } from '@/lib/format'
import { useDexSearch } from '@/lib/dex-search'
import { filterMoves, indexMoves, type MoveRow } from '@/lib/move-filter'
import { BATTLE_TYPES, isBattleType, type TypeName } from '@/lib/types'
import { usePageScroller } from '@/lib/virtual-page'

interface MoveSearch {
  /** Each is absent rather than empty, so an unfiltered list has a clean URL. */
  q?: string
  type?: TypeName
  class?: string
}

export const Route = createFileRoute('/moves/')({
  validateSearch: (input: Record<string, unknown>): MoveSearch => {
    const q = typeof input.q === 'string' ? input.q : ''
    const type = typeof input.type === 'string' && isBattleType(input.type) ? input.type : ''
    const damageClass = typeof input.class === 'string' ? input.class : ''

    return {
      ...(q ? { q } : {}),
      ...(type ? { type } : {}),
      ...(damageClass ? { class: damageClass } : {}),
    }
  },
  loader: ({ context }) => context.queryClient.query(cached(moveIndexQuery)),
  component: MoveIndex,
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} />,
  pendingComponent: () => <p className="py-16 text-center text-ink-lo">Walking the moves…</p>,
})

const ROW_HEIGHT = 40

function MoveIndex() {
  const { q = '', type = '', class: damageClass = '' } = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data: index } = useSuspenseQuery(moveIndexQuery)
  // The two reference queries the whole grid is read from. Both are cached for
  // the session, and the list renders without waiting for either.
  const { data: types } = useQuery(allTypesQuery)
  const { data: classes } = useQuery(allDamageClassesQuery)

  const rows = useMemo(() => indexMoves(index, types, classes), [index, types, classes])

  const [draft, setDraft] = useDexSearch(q, (next) => onChange({ q: next }))
  // Filtering a thousand rows per keystroke would block the input.
  const deferredQuery = useDeferredValue(draft)
  const matches = useMemo(
    () => filterMoves(rows, deferredQuery, type, damageClass),
    [rows, deferredQuery, type, damageClass],
  )

  function onChange(next: Partial<MoveSearch>) {
    const merged = { q: draft, type, class: damageClass, ...next }
    void navigate({
      search: {
        ...(merged.q ? { q: merged.q } : {}),
        ...(merged.type ? { type: merged.type as TypeName } : {}),
        ...(merged.class ? { class: merged.class } : {}),
      },
      replace: true,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl tracking-tight">Moves</h1>

        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Filter by name…"
          aria-label="Filter the moves"
          className="well w-full max-w-xs px-3 py-1.5 text-sm text-ink-hi placeholder:text-ink-lo"
        />

        <label className="flex items-center gap-2 text-micro uppercase text-ink-lo">
          Type
          <select
            value={type}
            onChange={(event) => onChange({ type: event.target.value as TypeName })}
            className="well cursor-pointer px-2 py-1 text-sm text-ink-mid"
          >
            <option value="">any</option>
            {BATTLE_TYPES.map((name) => (
              <option key={name} value={name}>
                {humanize(name)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-micro uppercase text-ink-lo">
          Class
          <select
            value={damageClass}
            onChange={(event) => onChange({ class: event.target.value })}
            className="well cursor-pointer px-2 py-1 text-sm text-ink-mid"
          >
            <option value="">any</option>
            {classes?.map((entry) => (
              <option key={entry.name} value={entry.name}>
                {humanize(entry.name)}
              </option>
            ))}
          </select>
        </label>

        <p className="ml-auto text-micro uppercase text-ink-lo">
          {/* Keyed on the count so a filter landing is visible in the figure. */}
          <output key={matches.length} className="pop" data-numeric>
            {matches.length}
          </output>{' '}
          of <output data-numeric>{index.length}</output>
        </p>
      </header>

      {matches.length === 0 ? (
        <p className="rise-fast py-16 text-center text-ink-lo">Nothing matches these filters.</p>
      ) : (
        <VirtualMoveRows matches={matches} signature={`${deferredQuery}|${type}|${damageClass}`} />
      )}
    </div>
  )
}

/**
 * Owns the virtualizer alone, for the reason the dex grid documents: the React
 * Compiler bails out of any component holding one.
 */
function VirtualMoveRows({
  matches,
  /** What the result set is of. The list fades when it changes, never on scroll. */
  signature,
}: {
  matches: readonly MoveRow[]
  signature: string
}) {
  const [list, setList] = useState<HTMLDivElement | null>(null)
  // The list scrolls with the page rather than inside itself; `scrollMargin` is
  // what the header above it is taking.
  const { scroller, scrollMargin } = usePageScroller(list)

  // oxlint-disable-next-line react/incompatible-library -- the bail-out is contained to this component
  const virtualizer = useVirtualizer({
    count: matches.length,
    getScrollElement: () => scroller,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    scrollMargin,
  })

  return (
    // `overflow-hidden` only for the corners: the rows are positioned, and the
    // panel's radius has nothing to clip them with otherwise.
    <div ref={setList} className="panel overflow-hidden">
      {/* Container, not row: rows mount and unmount as they scroll. See the
          dex grid for why this is not on the measured element either. */}
      <div
        key={signature}
        className="fade-in relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const row = matches[item.index]
          return (
            <Link
              key={item.key}
              to="/moves/$name"
              params={{ name: row.name }}
              className="absolute inset-x-0 top-0 flex items-center gap-3 border-b border-line px-3 text-sm text-ink-hi hover:bg-surface-2"
              style={{ height: item.size, transform: `translateY(${item.start - scrollMargin}px)` }}
            >
              <span className="w-12 shrink-0 text-micro text-ink-lo" data-numeric>
                {row.id}
              </span>
              <span className="flex-1 truncate">{humanize(row.name)}</span>
              {row.type && <TypeChip name={row.type} asLink={false} />}
              <span className="w-20 shrink-0 text-right text-micro uppercase text-ink-lo">
                {row.damageClass ?? ''}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
