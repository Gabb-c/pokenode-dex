import { Suspense } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { locationQuery, regionQuery } from '@/api/queries/locations'
import { cached, isNotFound } from '@/api/query-client'
import { AreaEncounters } from '@/components/dex/AreaEncounters'
import { DetailHeader } from '@/components/ui/DetailHeader'
import { NotFound } from '@/components/ui/NotFound'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { generationLabel, humanize } from '@/lib/format'
import { compact, optionalString } from '@/lib/search-params'

interface RegionSearch {
  /** Both absent rather than empty, so an unopened region has a clean URL. */
  loc?: string
  ver?: string
}

export const Route = createFileRoute('/locations/$region')({
  validateSearch: (input: Record<string, unknown>): RegionSearch =>
    compact({ loc: optionalString(input.loc), ver: optionalString(input.ver) }),
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.query(cached(regionQuery(params.region)))
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
  },
  component: RegionDetail,
  notFoundComponent: () => <UnknownRegion />,
  pendingComponent: () => <Skeleton label="Loading" lines={4} />,
})

function RegionDetail() {
  const { region: slug } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: region } = useSuspenseQuery(regionQuery(slug))

  const names = region.locations.map((link) => link.name).sort()
  // A region with no location chosen shows its first, so the page is never a
  // picker over an empty panel.
  const chosen = search.loc && names.includes(search.loc) ? search.loc : names[0]

  const refine = (next: Partial<RegionSearch>) =>
    void navigate({ search: compact({ ...search, ...next }), replace: true })

  return (
    <article className="mx-auto flex w-full max-w-280 flex-col gap-6">
      <DetailHeader
        id={`#${region.id}`}
        title={humanize(region.name)}
        subtitle={<p className="text-ink-lo">{generationLabel(region.main_generation.name)}</p>}
        aside={
          <span className="well px-2.5 py-1 text-micro uppercase text-ink-mid">
            <output data-numeric>{region.locations.length}</output> locations
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select label="Location" value={chosen ?? ''} onChange={(next) => refine({ loc: next, ver: undefined })}>
          {names.map((name) => (
            <option key={name} value={name}>
              {humanize(name)}
            </option>
          ))}
        </Select>
      </div>

      {chosen ? (
        <Suspense key={chosen} fallback={<Skeleton label="Encounters" lines={5} />}>
          <Encounters name={chosen} version={search.ver} onSelect={(ver) => refine({ ver })} />
        </Suspense>
      ) : (
        <p className="py-16 text-center text-ink-lo">This region publishes no locations.</p>
      )}
    </article>
  )
}

/**
 * The location resolves here rather than in the route, so choosing another one
 * suspends only the panel and leaves the picker above it on screen.
 */
function Encounters({
  name,
  version,
  onSelect,
}: {
  name: string
  version: string | undefined
  onSelect: (version: string) => void
}) {
  const { data: location } = useSuspenseQuery(locationQuery(name))
  return <AreaEncounters location={location} requested={version} onSelect={onSelect} />
}

function UnknownRegion() {
  const { region } = Route.useParams()
  return (
    <NotFound eyebrow="404 · not retried" back={{ to: '/locations', label: 'Back to the regions' }}>
      The PokéAPI knows no region called <span className="font-mono">{region}</span>.
    </NotFound>
  )
}
