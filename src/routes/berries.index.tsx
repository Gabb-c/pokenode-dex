import { useDeferredValue, useMemo } from 'react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  berryFirmnessesQuery,
  berryFlavorsQuery,
  berryIndexQuery,
} from '@/api/queries/berries'
import { cached } from '@/api/query-client'
import { Loading } from '@/components/ui/Loading'
import { Select } from '@/components/ui/Select'
import { humanize } from '@/lib/format'
import { useDexSearch } from '@/hooks/use-dex-search'
import { filterBerries, indexBerries } from '@/lib/berries/filter'
import { compact, optionalString } from '@/lib/search-params'

interface BerrySearch {
  /** Each is absent rather than empty, so an unfiltered list has a clean URL. */
  q?: string
  flavor?: string
  firmness?: string
}

export const Route = createFileRoute('/berries/')({
  validateSearch: (input: Record<string, unknown>): BerrySearch =>
    compact({
      q: optionalString(input.q),
      flavor: optionalString(input.flavor),
      firmness: optionalString(input.firmness),
    }),
  loader: ({ context }) => context.queryClient.query(cached(berryIndexQuery)),
  component: BerryIndex,
  pendingComponent: () => <Loading>Walking the berries…</Loading>,
})

function BerryIndex() {
  const { q = '', flavor = '', firmness = '' } = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data: index } = useSuspenseQuery(berryIndexQuery)
  // The two reference queries the whole list is read from. Both are cached for
  // the session, and the rows render without waiting for either.
  const { data: flavors } = useQuery(berryFlavorsQuery)
  const { data: firmnesses } = useQuery(berryFirmnessesQuery)

  const rows = useMemo(
    () => indexBerries(index, flavors, firmnesses),
    [index, flavors, firmnesses],
  )

  const [draft, setDraft] = useDexSearch(q, (next) => onChange({ q: next }))
  const deferredQuery = useDeferredValue(draft)
  const matches = useMemo(
    () => filterBerries(rows, deferredQuery, flavor, firmness),
    [rows, deferredQuery, flavor, firmness],
  )

  function onChange(next: Partial<BerrySearch>) {
    const merged = { q: draft, flavor, firmness, ...next }
    void navigate({
      search: {
        ...(merged.q ? { q: merged.q } : {}),
        ...(merged.flavor ? { flavor: merged.flavor } : {}),
        ...(merged.firmness ? { firmness: merged.firmness } : {}),
      },
      replace: true,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl tracking-tight">Berries</h1>

        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Filter by name…"
          aria-label="Filter the berries"
          className="well w-full max-w-xs px-3 py-1.5 text-sm text-ink-hi placeholder:text-ink-lo"
        />

        <Select label="Flavour" value={flavor} onChange={(next) => onChange({ flavor: next })}>
          <option value="">any</option>
          {flavors?.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {humanize(entry.name)}
            </option>
          ))}
        </Select>

        <Select
          label="Firmness"
          value={firmness}
          onChange={(next) => onChange({ firmness: next })}
        >
          <option value="">any</option>
          {firmnesses?.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {humanize(entry.name)}
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

      <p className="max-w-prose text-sm text-ink-lo">
        The flavour and firmness beside each berry cost no request of their own. Both resources
        name the berries that belong to them, so ten of them label all sixty-odd rows — the same
        trade the move list makes with its types.
      </p>

      {matches.length === 0 ? (
        <p className="rise-fast py-16 text-center text-ink-lo">Nothing matches these filters.</p>
      ) : (
        <ul
          key={`${deferredQuery}|${flavor}|${firmness}`}
          className="fade-in grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]"
        >
          {matches.map((row) => (
            <li key={row.name}>
              <Link
                to="/berries/$name"
                params={{ name: row.name }}
                className="panel flex items-baseline gap-2 p-3 text-sm text-ink-hi transition-colors hover:border-line-strong"
              >
                <span className="text-micro text-ink-lo" data-numeric>
                  {row.id}
                </span>
                <span className="flex-1 truncate">{humanize(row.name)}</span>
                {row.dominant && (
                  <span className="text-micro uppercase text-ink-lo">{row.dominant}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
