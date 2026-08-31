import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { pokedexesQuery } from '@/api/queries/games'
import { cached } from '@/api/query-client'
import { Loading } from '@/components/ui/Loading'
import { humanize } from '@/lib/format'

export const Route = createFileRoute('/games/')({
  loader: ({ context }) => context.queryClient.query(cached(pokedexesQuery)),
  component: PokedexIndex,
  pendingComponent: () => <Loading>Listing the Pokédexes…</Loading>,
})

function PokedexIndex() {
  const { data: pokedexes } = useSuspenseQuery(pokedexesQuery)

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl tracking-tight">Pokédexes</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-lo">
          Every dex the API publishes, from the national one down to a single island.
          Opening one is a single <code className="font-mono text-ink-mid">getPokedexByName</code>:
          it carries the whole species list and the number each was given, so the grid it draws
          costs nothing further.
        </p>
      </header>

      <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]">
        {pokedexes.map((pokedex) => (
          <li key={pokedex.name}>
            <Link
              to="/games/$dex"
              params={{ dex: pokedex.name }}
              className="panel block p-3 text-sm text-ink-hi transition-colors hover:border-line-strong"
            >
              {humanize(pokedex.name)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
