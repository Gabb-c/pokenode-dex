import { useDeferredValue, useMemo } from 'react'
import { useQueries, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { generationMembersQuery, generationsQuery } from '@/api/queries/games'
import { searchIndexQuery } from '@/api/queries/search-index'
import { membersOf, typeMembersQuery } from '@/api/queries/types'
import { cached } from '@/api/query-client'
import { DexFilters } from '@/components/dex/DexFilters'
import { DexGrid } from '@/components/dex/DexGrid'
import { Select } from '@/components/ui/Select'
import { Loading } from '@/components/ui/Loading'
import { filterDex } from '@/lib/dex/filter'
import { generationLabel } from '@/lib/format'
import { useDexSearch } from '@/hooks/use-dex-search'
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
  component: DexIndex,
  pendingComponent: () => <Loading>Walking the dex…</Loading>,
})

function DexIndex() {
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

  function onChange(next: Partial<DexSearch>) {
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
        value={{ q: draft, types }}
        showing={matches.length}
        total={index.length}
        active={draft !== '' || gen !== '' || types.length > 0}
        onQueryChange={setDraft}
        onChange={onChange}
        onClear={() => {
          setDraft('')
          onChange({ q: '', gen: '', types: [] })
        }}
      >
        <Select label="Generation" value={gen} onChange={(next) => onChange({ gen: next })}>
          <option value="">any</option>
          {generations?.map((generation) => (
            <option key={generation.name} value={generation.name}>
              {generationLabel(generation.name)}
            </option>
          ))}
        </Select>
      </DexFilters>

      {matches.length === 0 ? (
        <p className="rise-fast py-16 text-center text-ink-lo">Nothing matches these filters.</p>
      ) : (
        <DexGrid matches={matches} signature={`${deferredQuery}|${gen}|${types.join()}`} />
      )}
    </div>
  )
}
