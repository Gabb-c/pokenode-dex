import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { regionsQuery } from '@/api/queries/locations'
import { cached } from '@/api/query-client'
import { Loading } from '@/components/ui/Loading'
import { humanize } from '@/lib/format'

export const Route = createFileRoute('/locations/')({
  loader: ({ context }) => context.queryClient.query(cached(regionsQuery)),
  component: RegionIndex,
  pendingComponent: () => <Loading>Listing the regions…</Loading>,
})

function RegionIndex() {
  const { data: regions } = useSuspenseQuery(regionsQuery)

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl tracking-tight">Locations</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-lo">
          The encounter tables read from the other end. A Pokémon's page asks where one species
          lives; a region asks what lives in one place. Each region already names every location
          in it, so opening one costs nothing beyond the region itself.
        </p>
      </header>

      <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]">
        {regions.map((region) => (
          <li key={region.name}>
            <Link
              to="/locations/$region"
              params={{ region: region.name }}
              search={{}}
              className="panel flex flex-col gap-1 p-3 transition-colors hover:border-line-strong"
            >
              <span className="text-sm text-ink-hi">{humanize(region.name)}</span>
              <span className="text-micro uppercase text-ink-lo">
                <output data-numeric>{region.locations.length}</output> locations
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
