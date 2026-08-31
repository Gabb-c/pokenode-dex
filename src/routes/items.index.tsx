import { useDeferredValue, useMemo } from 'react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { allItemCategoriesQuery, itemIndexQuery } from '@/api/queries/items'
import { cached } from '@/api/query-client'
import { Loading } from '@/components/ui/Loading'
import { Select } from '@/components/ui/Select'
import { VirtualRows } from '@/components/ui/VirtualRows'
import { humanize } from '@/lib/format'
import { useDexSearch } from '@/hooks/use-dex-search'
import { categoriesIn, filterItems, indexItems } from '@/lib/items/filter'
import { compact, optionalString } from '@/lib/search-params'

interface ItemSearch {
  /** Each is absent rather than empty, so an unfiltered list has a clean URL. */
  q?: string
  pocket?: string
  category?: string
}

export const Route = createFileRoute('/items/')({
  validateSearch: (input: Record<string, unknown>): ItemSearch =>
    compact({
      q: optionalString(input.q),
      pocket: optionalString(input.pocket),
      category: optionalString(input.category),
    }),
  loader: ({ context }) => context.queryClient.query(cached(itemIndexQuery)),
  component: ItemIndex,
  pendingComponent: () => <Loading>Walking the items…</Loading>,
})

const ROW_HEIGHT = 40

function ItemIndex() {
  const { q = '', pocket = '', category = '' } = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data: index } = useSuspenseQuery(itemIndexQuery)
  // The reference query the whole grid is read from: cached for the session,
  // and the list renders without waiting for it.
  const { data: categories } = useQuery(allItemCategoriesQuery)

  const rows = useMemo(() => indexItems(index, categories), [index, categories])
  const pockets = useMemo(
    () => [...new Set((categories ?? []).map((entry) => entry.pocket.name))].sort(),
    [categories],
  )
  const inPocket = useMemo(() => categoriesIn(categories, pocket), [categories, pocket])

  const [draft, setDraft] = useDexSearch(q, (next) => onChange({ q: next }))
  // Filtering two thousand rows per keystroke would block the input.
  const deferredQuery = useDeferredValue(draft)
  const matches = useMemo(
    () => filterItems(rows, deferredQuery, pocket, category),
    [rows, deferredQuery, pocket, category],
  )

  function onChange(next: Partial<ItemSearch>) {
    const merged = { q: draft, pocket, category, ...next }
    // A category belongs to one pocket, so changing the pocket drops a category
    // that is no longer in it rather than leaving an empty list behind.
    if (next.pocket !== undefined) merged.category = ''
    void navigate({
      search: {
        ...(merged.q ? { q: merged.q } : {}),
        ...(merged.pocket ? { pocket: merged.pocket } : {}),
        ...(merged.category ? { category: merged.category } : {}),
      },
      replace: true,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl tracking-tight">Items</h1>

        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Filter by name…"
          aria-label="Filter the items"
          className="well w-full max-w-xs px-3 py-1.5 text-sm text-ink-hi placeholder:text-ink-lo"
        />

        <Select label="Pocket" value={pocket} onChange={(next) => onChange({ pocket: next })}>
          <option value="">any</option>
          {pockets.map((name) => (
            <option key={name} value={name}>
              {humanize(name)}
            </option>
          ))}
        </Select>

        <Select
          label="Category"
          value={category}
          onChange={(next) => onChange({ category: next })}
        >
          <option value="">any</option>
          {inPocket.map((name) => (
            <option key={name} value={name}>
              {humanize(name)}
            </option>
          ))}
        </Select>

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
        <VirtualRows
          items={matches}
          signature={`${deferredQuery}|${pocket}|${category}`}
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
              {/* The pocket is the coarser of the two and the one that survives a
                  narrow screen; the category is on the item's own page either way. */}
              <span className="hidden w-28 shrink-0 truncate text-right text-micro uppercase text-ink-lo sm:block">
                {row.category ?? ''}
              </span>
              <span className="w-20 shrink-0 truncate text-right text-micro uppercase text-ink-lo">
                {row.pocket ?? ''}
              </span>
            </Link>
          )}
        </VirtualRows>
      )}
    </div>
  )
}
