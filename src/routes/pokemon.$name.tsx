import { Suspense, type CSSProperties } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import type { Pokemon, PokemonSpecies } from 'pokenode-ts'
import { pokemonQuery, speciesQuery } from '@/api/queries/pokemon'
import { evolutionChainQuery } from '@/api/queries/evolution'
import { matchupsQuery } from '@/api/queries/types'
import { isNotFound } from '@/api/query-client'
import { SpriteViewer } from '@/components/dex/SpriteViewer'
import { EvolutionGraph } from '@/components/dex/EvolutionGraph'
import { StatBar } from '@/components/dex/StatBar'
import { TypeChip } from '@/components/dex/TypeChip'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  cleanFlavorText,
  dexNo,
  effectiveness,
  generationLabel,
  humanize,
  kilograms,
  metres,
} from '@/lib/format'
import { useLocalized } from '@/lib/language'
import { notableMatchups, typeVar } from '@/lib/types'

export const Route = createFileRoute('/pokemon/$name')({
  /**
   * Species has to wait for the Pokémon it hangs off, but matchups and the
   * evolution chain do not: started here rather than from their Suspense
   * boundaries, they overlap instead of queueing behind the render.
   */
  loader: async ({ context: { queryClient }, params }) => {
    try {
      const pokemon = await queryClient.ensureQueryData(pokemonQuery(params.name))
      void queryClient.prefetchQuery(matchupsQuery(pokemon))
      const species = await queryClient.ensureQueryData(speciesQuery(pokemon))
      void queryClient.prefetchQuery(evolutionChainQuery(species))
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
  },
  component: PokemonDetail,
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} />,
  notFoundComponent: () => <UnknownPokemon />,
  pendingComponent: () => <Skeleton label="Loading" lines={6} />,
})

function PokemonDetail() {
  const { name } = Route.useParams()
  const { data: pokemon } = useSuspenseQuery(pokemonQuery(name))
  const { data: species } = useSuspenseQuery(speciesQuery(pokemon))

  const tint = typeVar(pokemon.types[0]?.type.name ?? '')
  const style = { '--t': tint } as CSSProperties
  const displayName = useLocalized(species.names)?.name ?? humanize(pokemon.name)
  const genus = useLocalized(species.genera)?.genus
  const flavor = useLocalized(species.flavor_text_entries)?.flavor_text

  return (
    <article className="mx-auto flex w-full max-w-[70rem] flex-col gap-6" style={style}>
      {/* The rule under the name is the primary type: the page reads as this specimen's. */}
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 border-transparent pb-2 [border-image:linear-gradient(to_right,var(--t),transparent_60%)_1]">
        <span className="text-lg text-ink-lo" data-numeric>
          {dexNo(pokemon.id)}
        </span>
        <h1 className="text-3xl tracking-tight">{displayName}</h1>
        {genus && <p className="text-ink-lo">{genus}</p>}
        <div className="ml-auto flex gap-2">
          {pokemon.types.map((slot) => (
            <TypeChip key={slot.slot} name={slot.type.name} />
          ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,48rem)]">
        <div className="flex flex-col gap-4">
          <SpriteViewer id={pokemon.id} name={displayName} tint={tint} />
          <Vitals pokemon={pokemon} species={species} />
        </div>

        <div className="flex flex-col gap-6">
          {flavor && (
            <div className="panel p-4">
              {/* The panel holds the column; the measure holds the line length. */}
              <p className="max-w-[62ch] text-ink-mid italic">{cleanFlavorText(flavor)}</p>
            </div>
          )}
          <BaseStats pokemon={pokemon} tint={tint} />
          <Abilities pokemon={pokemon} />
          <Suspense fallback={<Skeleton label="Defensive matchups" />}>
            <Matchups pokemon={pokemon} />
          </Suspense>
          <Suspense fallback={<Skeleton label="Evolution" lines={2} />}>
            <Evolution species={species} current={species.name} />
          </Suspense>
        </div>
      </div>
    </article>
  )
}

function Vitals({ pokemon, species }: { pokemon: Pokemon; species: PokemonSpecies }) {
  // Mono is for figures, so a row says whether its value is one.
  const rows = [
    ['Height', metres(pokemon.height), true],
    ['Weight', kilograms(pokemon.weight), true],
    ['Generation', generationLabel(species.generation.name), false],
    ['Base exp.', pokemon.base_experience ? String(pokemon.base_experience) : '—', true],
    ['Capture rate', String(species.capture_rate), true],
    ['Growth', humanize(species.growth_rate.name), false],
  ] as const

  return (
    <dl className="panel divide-y divide-line">
      {rows.map(([label, value, numeric]) => (
        <div key={label} className="flex items-center justify-between px-4 py-2">
          <dt className="text-micro uppercase text-ink-lo">{label}</dt>
          <dd className="text-sm text-ink-hi" data-numeric={numeric ? '' : undefined}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function BaseStats({ pokemon, tint }: { pokemon: Pokemon; tint: string }) {
  const total = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Base stats</h2>
      <div className="mt-3 flex flex-col gap-2">
        {pokemon.stats.map((stat) => (
          <StatBar
            key={stat.stat.name}
            label={shortStat(stat.stat.name)}
            value={stat.base_stat}
            tint={tint}
          />
        ))}
      </div>
      <p className="mt-3 border-t border-line pt-2 text-right text-sm text-ink-mid">
        Total <output className="text-ink-hi">{total}</output>
      </p>
    </section>
  )
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

function shortStat(name: string): string {
  return STAT_LABELS[name] ?? humanize(name)
}

function Abilities({ pokemon }: { pokemon: Pokemon }) {
  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Abilities</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {pokemon.abilities.map((entry) => (
          <li
            key={entry.ability.name}
            className="well px-2.5 py-1 text-sm text-ink-hi"
          >
            {humanize(entry.ability.name)}
            {entry.is_hidden && <span className="ml-2 text-micro text-ink-lo">hidden</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Matchups({ pokemon }: { pokemon: Pokemon }) {
  const { data: chart } = useSuspenseQuery(matchupsQuery(pokemon))
  const { weaknesses, resistances, immunities } = notableMatchups(chart)

  const groups = [
    ['Weak to', weaknesses],
    ['Resists', resistances],
    ['Immune to', immunities],
  ] as const

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Defensive matchups</h2>
      <div className="mt-3 flex flex-col gap-3">
        {groups.map(([label, names]) =>
          names.length === 0 ? null : (
            <div key={label} className="flex flex-wrap items-center gap-2">
              <span className="w-20 shrink-0 text-micro uppercase text-ink-lo">{label}</span>
              {names.map((name) => (
                <span key={name} className="flex items-center gap-1">
                  <TypeChip name={name} />
                  <span className="text-micro text-ink-lo" data-numeric>
                    ×{effectiveness(chart[name])}
                  </span>
                </span>
              ))}
            </div>
          ),
        )}
      </div>
    </section>
  )
}

function Evolution({ species, current }: { species: PokemonSpecies; current: string }) {
  const { data: chain } = useSuspenseQuery(evolutionChainQuery(species))
  if (chain.chain.evolves_to.length === 0) return null

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Evolution</h2>
      <div className="mt-3">
        <EvolutionGraph chain={chain.chain} current={current} />
      </div>
    </section>
  )
}

function UnknownPokemon() {
  const { name } = Route.useParams()
  return (
    <div className="panel mx-auto my-16 max-w-xl p-6">
      <p className="text-micro uppercase text-ink-lo">404 · not retried</p>
      <h2 className="mt-2 text-lg">
        The PokéAPI knows no Pokémon called <span className="font-mono">{name}</span>.
      </h2>
      <Link to="/pokemon" className="mt-5 inline-block text-sm text-accent">
        Back to the dex
      </Link>
    </div>
  )
}
