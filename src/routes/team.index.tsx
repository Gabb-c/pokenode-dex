import { useQueries, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { getPokemonSpriteUrl } from 'pokenode-ts'
import { pokemonQuery } from '@/api/queries/pokemon'
import { searchIndexQuery } from '@/api/queries/search-index'
import { matchupsQuery } from '@/api/queries/types'
import { cached } from '@/api/query-client'
import { CoverageGrid } from '@/components/team/CoverageGrid'
import { GuessBox } from '@/components/play/GuessBox'
import { Loading } from '@/components/ui/Loading'
import { humanize } from '@/lib/format'
import { TEAM_SIZE, useTeam } from '@/hooks/use-team'
import type { Matchups } from '@/lib/types'

export const Route = createFileRoute('/team/')({
  loader: ({ context }) => context.queryClient.query(cached(searchIndexQuery)),
  component: TeamBuilder,
  pendingComponent: () => <Loading>Walking the dex…</Loading>,
})

/** Module-scoped rather than inline: the observer keys its memo on this identity. */
const chartsOf = (results: { data: Matchups | undefined }[]) =>
  results.map((result) => result.data).filter((chart): chart is Matchups => chart !== undefined)

function TeamBuilder() {
  const { data: index } = useSuspenseQuery(searchIndexQuery)
  const { team, add, remove, clear } = useTeam()

  const members = useQueries({
    queries: team.map((name) => pokemonQuery(name)),
  })

  const charts = useQueries({
    queries: members
      .map((result) => result.data)
      .filter((pokemon) => pokemon !== undefined)
      .map((pokemon) => matchupsQuery(pokemon)),
    combine: chartsOf,
  })

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl tracking-tight">Team</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-lo">
          Six slots, kept in this browser rather than on a server. Reload the page and the team
          is still here — the same <code className="font-mono text-ink-mid">localStorage</code>{' '}
          the transport caches into, under the same prefix.
        </p>
      </header>

      {team.length < TEAM_SIZE && (
        <GuessBox
          index={index}
          onGuess={add}
          label="Add a Pokémon"
          placeholder="Add a Pokémon"
        />
      )}

      {team.length === 0 ? (
        <p className="py-16 text-center text-ink-lo">Name a Pokémon to start a team.</p>
      ) : (
        <>
          <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(9rem,1fr))]">
            {team.map((name, slot) => (
              <li key={name} className="panel flex flex-col items-center gap-1 p-3">
                {/* The id arrives with the member, and a URL built from a
                    placeholder would flash a broken image on the way. */}
                {members[slot]?.data ? (
                  <img
                    src={getPokemonSpriteUrl(members[slot].data.id, {
                      variant: 'official-artwork',
                    })}
                    alt=""
                    width={72}
                    height={72}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="size-18 object-contain"
                  />
                ) : (
                  <span aria-hidden className="size-18" />
                )}
                <Link
                  to="/pokemon/$name"
                  params={{ name }}
                  search={{}}
                  className="text-center text-sm text-accent hover:underline"
                >
                  {humanize(name)}
                </Link>
                <button
                  type="button"
                  onClick={() => remove(name)}
                  className="btn px-2 py-0.5 text-micro uppercase text-ink-lo hover:text-ink-hi"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          {/* The grid narrows as the members land rather than waiting for all six. */}
          <CoverageGrid charts={charts} />

          <div>
            <button
              type="button"
              onClick={clear}
              className="btn px-3 py-1 text-sm text-ink-lo hover:text-ink-hi"
            >
              Clear the team
            </button>
          </div>
        </>
      )}
    </div>
  )
}
