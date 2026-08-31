import { useDeferredValue, useLayoutEffect, useMemo, useState } from 'react'
import {
  useQueries,
  useQuery,
  useSuspenseQuery,
  type UseQueryResult,
} from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useVirtualizer } from '@tanstack/react-virtual'
import { generationMembersQuery, generationsQuery } from '@/api/queries/games'
import { type DexEntry, searchIndexQuery } from '@/api/queries/search-index'
import { typeMembersQuery } from '@/api/queries/types'
import { cached } from '@/api/query-client'
import { DexFilters, type DexFilterState } from '@/components/dex/DexFilters'
import { PokemonCard } from '@/components/dex/PokemonCard'
import { Loading } from '@/components/ui/Loading'
import { filterDex } from '@/lib/dex/filter'
import { useDexSearch } from '@/hooks/use-dex-search'
import { usePageScroller } from '@/hooks/use-page-scroller'
import type { TypeName } from '@/lib/types'
import { battleTypes, compact, optionalString } from '@/lib/search-params'

interface DexSearch {
  /** Each is absent rather than empty, so an unfiltered dex has a clean URL. */
  q?: string
  gen?: string
  types?: TypeName[]
}

export const Route = createFileRoute('/pokemon/')({
  validateSearch: (input: Record<string, unknown>): DexSearch =>
    compact({
      q: optionalString(input.q),
      gen: optionalString(input.gen),
      types: battleTypes(input.types),
    }),
  loader: ({ context }) => context.queryClient.query(cached(searchIndexQuery)),
  component: DexGrid,
  pendingComponent: () => <Loading>Walking the dex…</Loading>,
})

const CARD_MIN = 150
const ROW_HEIGHT = 186

/** Module-scoped: the observer keys its memo on this identity. */
const membersOf = (results: UseQueryResult<ReadonlySet<number>>[]) =>
  results.map((result) => result.data)

function DexGrid() {
  const { q = '', gen = '', types = [] } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: index } = useSuspenseQuery(searchIndexQuery)
  const { data: generations } = useQuery(generationsQuery)

  // Each filter is its own cached query, resolved to a set of ids.
  const { data: generationMembers } = useQuery({
    ...generationMembersQuery(gen),
    enabled: gen !== '',
  })
  const typeMembers = useQueries({
    queries: types.map((name) => typeMembersQuery(name)),
    combine: membersOf,
  })

  const [draft, setDraft] = useDexSearch(q, (next) => onChange({ q: next }))

  // Filtering a thousand entries per keystroke would block the input.
  const deferredQuery = useDeferredValue(draft)
  const matches = useMemo(
    () => filterDex(index, deferredQuery, generationMembers, typeMembers),
    [index, deferredQuery, generationMembers, typeMembers],
  )

  function onChange(next: Partial<DexFilterState>) {
    const merged = { q: draft, gen, types, ...next }
    void navigate({
      search: {
        ...(merged.q ? { q: merged.q } : {}),
        ...(merged.gen ? { gen: merged.gen } : {}),
        ...(merged.types.length ? { types: merged.types } : {}),
      },
      replace: true,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <DexFilters
        value={{ q: draft, gen, types }}
        generations={generations}
        showing={matches.length}
        total={index.length}
        onQueryChange={setDraft}
        onChange={onChange}
      />

      {matches.length === 0 ? (
        <p className="rise-fast py-16 text-center text-ink-lo">Nothing matches these filters.</p>
      ) : (
        <VirtualDexRows matches={matches} signature={`${deferredQuery}|${gen}|${types.join()}`} />
      )}
    </div>
  )
}

/**
 * Owns the virtualizer alone: React Compiler refuses to memoize any component
 * holding `useVirtualizer`, so keeping it here leaves the rest of the dex
 * compiled.
 */
function VirtualDexRows({
  matches,
  /** What the result set is of. The grid fades when it changes, never on scroll. */
  signature,
}: {
  matches: readonly DexEntry[]
  signature: string
}) {
  // Held as state, not a ref: the empty state unmounts this element, and a ref
  // identity never changes, so an effect keyed on one would not re-attach.
  const [list, setList] = useState<HTMLDivElement | null>(null)
  // The grid scrolls with the page rather than inside itself; `scrollMargin` is
  // what the filters above it are taking.
  const { scroller, scrollMargin } = usePageScroller(list)
  const columns = useColumns(list)

  // oxlint-disable-next-line react/incompatible-library -- the bail-out is contained to this component
  const virtualizer = useVirtualizer({
    count: Math.ceil(matches.length / columns),
    getScrollElement: () => scroller,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
    scrollMargin,
  })

  return (
    <div ref={setList}>
      {/* The fade sits here rather than on the measured element — keying that
          would rebuild the ResizeObservers and the virtualizer on every
          keystroke — and rather than on a row, which mounts and unmounts as it
          scrolls. Opacity only: a transform here would be a containing block
          nobody asked for. */}
      <div
        key={signature}
        className="fade-in relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            // Rows are positioned, so the row gutter has to be padding: a grid
            // `gap` only separates columns here.
            className="absolute inset-x-0 top-0 grid gap-3 pb-3"
            style={{
              height: row.size,
              transform: `translateY(${row.start - scrollMargin}px)`,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {matches.slice(row.index * columns, row.index * columns + columns).map((entry) => (
              <PokemonCard key={entry.id} id={entry.id} name={entry.name} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Columns follow the grid's own width, so the virtualizer can page by row. */
function useColumns(element: HTMLElement | null): number {
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    if (!element) return
    // Read once up front: waiting for the observer's first callback renders the
    // whole grid at one column, and the virtualizer sizes for every row of it.
    // oxlint-disable-next-line react/set-state-in-effect -- a measurement has no render-phase equivalent
    setWidth(element.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return Math.max(1, Math.floor(width / CARD_MIN))
}
