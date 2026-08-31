import { useDeferredValue, useMemo } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { resourceId } from 'pokenode-ts'
import { machineItemsQuery } from '@/api/queries/machines'
import { cached } from '@/api/query-client'
import { Loading } from '@/components/ui/Loading'
import { VirtualRows } from '@/components/ui/VirtualRows'
import { humanize } from '@/lib/format'
import { useDexSearch } from '@/hooks/use-dex-search'
import { compact, optionalString } from '@/lib/search-params'

interface MachineSearch {
  /** Absent rather than empty, so an unfiltered list has a clean URL. */
  q?: string
}

export const Route = createFileRoute('/machines/')({
  validateSearch: (input: Record<string, unknown>): MachineSearch =>
    compact({ q: optionalString(input.q) }),
  loader: ({ context }) => context.queryClient.query(cached(machineItemsQuery)),
  component: MachineIndex,
  pendingComponent: () => <Loading>Listing the machines…</Loading>,
})

const ROW_HEIGHT = 40

function MachineIndex() {
  const { q = '' } = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data: category } = useSuspenseQuery(machineItemsQuery)

  const rows = useMemo(
    () => category.items.map((link) => ({ id: resourceId(link), name: link.name })),
    [category],
  )

  const [draft, setDraft] = useDexSearch(q, (next) =>
    navigate({ search: next ? { q: next } : {}, replace: true }),
  )
  const deferredQuery = useDeferredValue(draft)
  const matches = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase().replaceAll(' ', '-')
    return term ? rows.filter((row) => row.name.includes(term)) : rows
  }, [rows, deferredQuery])

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl tracking-tight">Machines</h1>

        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Filter by name…"
          aria-label="Filter the machines"
          className="well w-full max-w-xs px-3 py-1.5 text-sm text-ink-hi placeholder:text-ink-lo"
        />

        <p className="ml-auto text-micro uppercase text-ink-lo">
          <output key={matches.length} className="pop" data-numeric>
            {matches.length}
          </output>{' '}
          of <output data-numeric>{rows.length}</output>
        </p>
      </header>

      <p className="max-w-prose text-sm text-ink-lo">
        Every TM, HM and TR, from one request. The machine endpoint lists its records by URL
        alone and none of them names the move it teaches, so this reads the item side of the same
        data instead. A machine is an item, so a row opens the item's page — and the move behind
        it is resolved there, from the unnamed link the item carries.
      </p>

      {matches.length === 0 ? (
        <p className="rise-fast py-16 text-center text-ink-lo">Nothing matches that name.</p>
      ) : (
        <VirtualRows
          items={matches}
          signature={deferredQuery}
          rowHeight={ROW_HEIGHT}
          keyOf={(row) => row.name}
        >
          {(row, style) => (
            <Link
              to="/items/$name"
              params={{ name: row.name }}
              className="absolute inset-x-0 top-0 flex items-center gap-3 border-b border-line px-3 text-sm text-ink-hi hover:bg-surface-2"
              style={style}
            >
              <span className="w-9 shrink-0 text-micro text-ink-lo sm:w-12" data-numeric>
                {row.id}
              </span>
              <span className="flex-1 truncate">{humanize(row.name)}</span>
            </Link>
          )}
        </VirtualRows>
      )}
    </div>
  )
}
