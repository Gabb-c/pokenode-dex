import { useDeferredValue, useLayoutEffect, useMemo, useState } from 'react'
import { useQueries, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useVirtualizer } from '@tanstack/react-virtual'
import { generationMembersQuery, generationsQuery } from '@/api/queries/games'
import { searchIndexQuery } from '@/api/queries/search-index'
import { typeMembersQuery } from '@/api/queries/types'
import { DexFilters, type DexFilterState } from '@/components/dex/DexFilters'
import { PokemonCard } from '@/components/dex/PokemonCard'
import { ErrorState } from '@/components/ui/ErrorState'
import { filterDex } from '@/lib/dex-filter'
import { isBattleType, type TypeName } from '@/lib/types'

interface DexSearch {
  /** Each is absent rather than empty, so an unfiltered dex has a clean URL. */
  q?: string
  gen?: string
  types?: TypeName[]
}

export const Route = createFileRoute('/pokemon/')({
  validateSearch: (input: Record<string, unknown>): DexSearch => {
    const q = typeof input.q === 'string' ? input.q : ''
    const gen = typeof input.gen === 'string' ? input.gen : ''
    const types = Array.isArray(input.types) ? input.types.filter(isBattleType) : []

    return { ...(q ? { q } : {}), ...(gen ? { gen } : {}), ...(types.length ? { types } : {}) }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(searchIndexQuery),
  component: DexGrid,
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} />,
  pendingComponent: () => <p className="py-16 text-center text-ink-lo">Walking the dex…</p>,
})

const CARD_MIN = 150
const ROW_HEIGHT = 186

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
    combine: (results) => results.map((result) => result.data),
  })

  // Filtering a thousand entries per keystroke would block the input.
  const deferredQuery = useDeferredValue(q)
  const matches = useMemo(
    () => filterDex(index, deferredQuery, generationMembers, typeMembers),
    [index, deferredQuery, generationMembers, typeMembers],
  )

  // Held as state, not a ref: the empty state unmounts this element, and a ref
  // identity never changes, so an effect keyed on one would not re-attach.
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null)
  const columns = useColumns(scroller)
  const rows = Math.ceil(matches.length / columns)

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scroller,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  })

  function onChange(next: Partial<DexFilterState>) {
    const merged = { q, gen, types, ...next }
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
    <div className="flex h-[calc(100dvh-11rem)] flex-col gap-4">
      <DexFilters
        value={{ q, gen, types }}
        generations={generations}
        showing={matches.length}
        total={index.length}
        onChange={onChange}
      />

      {matches.length === 0 ? (
        <p className="py-16 text-center text-ink-lo">Nothing matches these filters.</p>
      ) : (
        <div ref={setScroller} className="flex-1 overflow-y-auto">
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((row) => (
              <div
                key={row.key}
                // Rows are positioned, so the row gutter has to be padding: a grid
                // `gap` only separates columns here.
                className="absolute inset-x-0 top-0 grid gap-3 pb-3"
                style={{
                  height: row.size,
                  transform: `translateY(${row.start}px)`,
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {matches
                  .slice(row.index * columns, row.index * columns + columns)
                  .map((entry) => (
                    <PokemonCard key={entry.id} id={entry.id} name={entry.name} />
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Columns follow the container width, so the virtualizer can page by row. */
function useColumns(element: HTMLElement | null): number {
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return Math.max(1, Math.floor(width / CARD_MIN))
}
