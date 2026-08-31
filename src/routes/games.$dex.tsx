import { useDeferredValue, useMemo, type CSSProperties } from 'react'
import { useQueries, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { pokedexQuery } from '@/api/queries/games'
import { searchIndexQuery } from '@/api/queries/search-index'
import { membersOf, typeMembersQuery } from '@/api/queries/types'
import { cached, isNotFound } from '@/api/query-client'
import { DexFilters } from '@/components/dex/DexFilters'
import { DexGrid } from '@/components/dex/DexGrid'
import { DetailHeader } from '@/components/ui/DetailHeader'
import { NotFound } from '@/components/ui/NotFound'
import { Loading } from '@/components/ui/Loading'
import { filterDex } from '@/lib/dex/filter'
import { entriesOf } from '@/lib/dex/pokedex'
import { humanize } from '@/lib/format'
import { useDexSearch } from '@/hooks/use-dex-search'
import { useLocalized } from '@/hooks/use-language'
import type { TypeName } from '@/lib/types'
import { battleTypes, compact, optionalString } from '@/lib/search-params'

interface PokedexSearch {
  /** Each is absent rather than empty, so an unfiltered dex has a clean URL. */
  q?: string
  types?: TypeName[]
}

export const Route = createFileRoute('/games/$dex')({
  validateSearch: (input: Record<string, unknown>): PokedexSearch =>
    compact({
      q: optionalString(input.q),
      types: battleTypes(input.types),
    }),
  /**
   * The dex and the index are independent, so they overlap rather than queue:
   * the entries are useless without the index, which is what turns a species
   * link into a Pokémon the detail route can open.
   */
  loader: async ({ context: { queryClient }, params }) => {
    try {
      await Promise.all([
        queryClient.query(cached(pokedexQuery(params.dex))),
        queryClient.query(cached(searchIndexQuery)),
      ])
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
  },
  component: RegionalDex,
  notFoundComponent: () => (
    <NotFound eyebrow="404 · not retried" back={{ to: '/games', label: '← Every Pokédex' }}>
      No Pokédex by that name.
    </NotFound>
  ),
  pendingComponent: () => <Loading>Opening the Pokédex…</Loading>,
})

function RegionalDex() {
  const { dex } = Route.useParams()
  const { q = '', types = [] } = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data: pokedex } = useSuspenseQuery(pokedexQuery(dex))
  const { data: index } = useSuspenseQuery(searchIndexQuery)

  const typeMembers = useQueries({
    queries: types.map((name) => typeMembersQuery(name)),
    combine: membersOf,
  })

  const entries = useMemo(() => entriesOf(pokedex, index), [pokedex, index])

  const [draft, setDraft] = useDexSearch(q, (next) => onChange({ q: next }))
  // Filtering a thousand entries per keystroke would block the input.
  const deferredQuery = useDeferredValue(draft)
  const matches = useMemo(
    () => filterDex(entries, deferredQuery, undefined, typeMembers),
    [entries, deferredQuery, typeMembers],
  )

  // A dex names and describes itself in every language the games shipped in.
  const title = useLocalized(pokedex.names)?.name ?? humanize(pokedex.name)
  const description = useLocalized(pokedex.descriptions)?.description

  function onChange(next: Partial<PokedexSearch>) {
    const merged = { q: draft, types, ...next }
    void navigate({
      search: {
        ...(merged.q ? { q: merged.q } : {}),
        ...(merged.types.length ? { types: merged.types } : {}),
      },
      replace: true,
    })
  }

  return (
    // The masthead's rule reads `--t`; a dex has no type, so it takes the accent.
    <section className="flex flex-col gap-4" style={{ '--t': 'var(--accent)' } as CSSProperties}>
      <DetailHeader
        id={`#${pokedex.id}`}
        title={title}
        subtitle={
          <span className="text-sm text-ink-lo">
            <output data-numeric>{entries.length}</output> entries
          </span>
        }
      />
      {description && <p className="max-w-prose text-sm text-ink-lo">{description}</p>}

      <DexFilters
        value={{ q: draft, types }}
        showing={matches.length}
        total={entries.length}
        active={draft !== '' || types.length > 0}
        onQueryChange={setDraft}
        onChange={onChange}
        onClear={() => {
          setDraft('')
          onChange({ q: '', types: [] })
        }}
      />

      {matches.length === 0 ? (
        <p className="rise-fast py-16 text-center text-ink-lo">Nothing matches these filters.</p>
      ) : (
        <DexGrid matches={matches} signature={`${dex}|${deferredQuery}|${types.join()}`} />
      )}
    </section>
  )
}
