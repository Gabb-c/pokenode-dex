import { Suspense, type CSSProperties } from 'react'
import { noop, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import {
  defensiveProfile,
  type Ability,
  type GenerationName,
  type Item,
  type Pokemon,
  type PokemonHeldItem,
  type PokemonSpecies,
} from 'pokenode-ts'
import { pokemonQuery, speciesQuery } from '@/api/queries/pokemon'
import { abilitiesQuery } from '@/api/queries/abilities'
import { encountersQuery } from '@/api/queries/encounters'
import { evolutionChainQuery } from '@/api/queries/evolution'
import { heldItemsQuery } from '@/api/queries/items'
import { learnsetQuery } from '@/api/queries/moves'
import { allTypesQuery, matchupsQuery } from '@/api/queries/types'
import { cached, isNotFound } from '@/api/query-client'
import { SpriteViewer } from '@/components/dex/SpriteViewer'
import { EncounterTable } from '@/components/dex/EncounterTable'
import { EvolutionGraph } from '@/components/dex/EvolutionGraph'
import { GenerationPicker } from '@/components/dex/GenerationPicker'
import { MoveTable } from '@/components/dex/MoveTable'
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
import { encountersIn, versionsOf } from '@/lib/encounters'
import { isGenerationName } from '@/lib/generation'
import { useLatestFlavor, useLocalized } from '@/lib/language'
import { defaultVersionGroup, learnMethodsOf, versionGroupsOf } from '@/lib/learnset'
import { typesIn } from '@/lib/past-types'
import { notableMatchups, typeVar, type Matchups as MatchupChart } from '@/lib/types'

interface DetailSearch {
  /** Absent until the reader picks one, so an untouched page has a clean URL. */
  vg?: string
  learn?: string
  ver?: string
  /** The chart to read the page against; absent is the one in force today. */
  gen?: GenerationName
}

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch: (input: Record<string, unknown>): DetailSearch => {
    // Only the shape is checked here; a slug this Pokémon has no data for falls
    // back in the panel, which is the only place that knows what it carries.
    const vg = typeof input.vg === 'string' ? input.vg : ''
    const learn = typeof input.learn === 'string' ? input.learn : ''
    const ver = typeof input.ver === 'string' ? input.ver : ''
    const gen = typeof input.gen === 'string' && isGenerationName(input.gen) ? input.gen : undefined

    return {
      ...(vg ? { vg } : {}),
      ...(learn ? { learn } : {}),
      ...(ver ? { ver } : {}),
      ...(gen ? { gen } : {}),
    }
  },
  /**
   * Species has to wait for the Pokémon it hangs off, but matchups and the
   * evolution chain do not: started here rather than from their Suspense
   * boundaries, they overlap instead of queueing behind the render.
   *
   * The learnset is deliberately not among them. It is dozens of link fetches
   * and it sits below the fold, so it is paid for when it is reached.
   */
  loader: async ({ context: { queryClient }, params }) => {
    try {
      const pokemon = await queryClient.query(cached(pokemonQuery(params.name)))
      // Opportunistic: a failure here is raised again by the Suspense boundary
      // that actually reads the query, which is where the error UI lives.
      void queryClient.query(matchupsQuery(pokemon)).catch(noop)
      const species = await queryClient.query(cached(speciesQuery(pokemon)))
      void queryClient.query(evolutionChainQuery(species)).catch(noop)
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
  const { gen } = Route.useSearch()
  const { data: pokemon } = useSuspenseQuery(pokemonQuery(name))
  const { data: species } = useSuspenseQuery(speciesQuery(pokemon))

  // The typing the chosen generation knew, which is not always today's.
  const types = typesIn(pokemon, gen)
  const tint = typeVar(types[0]?.type.name ?? '')
  const style = { '--t': tint } as CSSProperties
  const displayName = useLocalized(species.names)?.name ?? humanize(pokemon.name)
  const genus = useLocalized(species.genera)?.genus
  const flavor = useLocalized(species.flavor_text_entries)?.flavor_text

  return (
    <article className="mx-auto flex w-full max-w-280 flex-col gap-6" style={style}>
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 border-transparent pb-2 [border-image:linear-gradient(to_right,var(--t),transparent_60%)_1]">
        <span className="text-lg text-ink-lo" data-numeric>
          {dexNo(pokemon.id)}
        </span>
        <h1 className="text-3xl tracking-tight">{displayName}</h1>
        {genus && <p className="text-ink-lo">{genus}</p>}
        <div className="ml-auto flex items-center gap-2">
          {gen && types !== pokemon.types && (
            <span className="text-micro uppercase text-ink-lo">as of {generationLabel(gen ?? '')}</span>
          )}
          {types.map((slot) => (
            <TypeChip key={slot.slot} name={slot.type.name} />
          ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,48rem)]">
        <div className="flex flex-col gap-4">
          <SpriteViewer id={pokemon.id} name={displayName} tint={tint} />
          <Vitals pokemon={pokemon} species={species} />
          {pokemon.held_items.length > 0 && (
            <Suspense fallback={<Skeleton label="Held items" />}>
              <HeldItems pokemon={pokemon} />
            </Suspense>
          )}
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
          <Matchups pokemon={pokemon} />
          <Suspense fallback={<Skeleton label="Evolution" lines={2} />}>
            <Evolution species={species} current={species.name} />
          </Suspense>
          <Learnset pokemon={pokemon} />
          <Suspense fallback={<Skeleton label="Where to find" lines={3} />}>
            <Encounters pokemon={pokemon} />
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

/**
 * The slugs are in the Pokémon payload, so they paint immediately; the effect
 * text is a link away and arrives under the boundary below.
 */
function Abilities({ pokemon }: { pokemon: Pokemon }) {
  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Abilities</h2>
      <Suspense fallback={<AbilitySlugs pokemon={pokemon} />}>
        <AbilityEffects pokemon={pokemon} />
      </Suspense>
    </section>
  )
}

function AbilitySlugs({ pokemon }: { pokemon: Pokemon }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {pokemon.abilities.map((entry) => (
        <li key={entry.ability.name} className="well px-2.5 py-1 text-sm text-ink-hi">
          {humanize(entry.ability.name)}
          {entry.is_hidden && <span className="ml-2 text-micro text-ink-lo">hidden</span>}
        </li>
      ))}
    </ul>
  )
}

function AbilityEffects({ pokemon }: { pokemon: Pokemon }) {
  const { data: abilities } = useSuspenseQuery(abilitiesQuery(pokemon))

  return (
    <ul className="mt-3 flex flex-col gap-3">
      {abilities.map((ability, index) => (
        <AbilityRow
          key={ability.id}
          ability={ability}
          hidden={pokemon.abilities[index]?.is_hidden ?? false}
        />
      ))}
    </ul>
  )
}

function AbilityRow({ ability, hidden }: { ability: Ability; hidden: boolean }) {
  const name = useLocalized(ability.names)?.name ?? humanize(ability.name)
  // The PokéAPI publishes effect text in English alone for most abilities, so
  // this is the fallback in `useLocalized` earning its place rather than a gap.
  const effect = useLocalized(ability.effect_entries)?.short_effect
  const flavor = useLatestFlavor(ability.flavor_text_entries)

  return (
    <li className="flex flex-col gap-1">
      <p className="text-sm text-ink-hi">
        {name}
        {hidden && <span className="ml-2 text-micro uppercase text-ink-lo">hidden</span>}
      </p>
      <p className="max-w-[62ch] text-sm text-ink-mid">
        {effect ?? (flavor ? cleanFlavorText(flavor.flavor_text) : '—')}
      </p>
    </li>
  )
}

/**
 * What a wild one is found holding, and how often.
 *
 * Only mounted when the Pokémon carries any: most hold nothing, and an empty
 * panel is worse than none.
 */
function HeldItems({ pokemon }: { pokemon: Pokemon }) {
  const { data: items } = useSuspenseQuery(heldItemsQuery(pokemon))

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Held items</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((item, index) => (
          <HeldItem
            key={item.id}
            item={item}
            rarity={rarityOf(pokemon.held_items[index])}
          />
        ))}
      </ul>
    </section>
  )
}

/** The games disagree on how often; the best odds are the useful answer. */
function rarityOf(held: PokemonHeldItem | undefined): number {
  return Math.max(0, ...(held?.version_details.map((detail) => detail.rarity) ?? []))
}

function HeldItem({ item, rarity }: { item: Item; rarity: number }) {
  const name = useLocalized(item.names)?.name ?? humanize(item.name)
  const effect = useLocalized(item.effect_entries)?.short_effect

  return (
    <li className="flex items-start gap-3">
      {item.sprites.default && (
        <img src={item.sprites.default} alt="" width={32} height={32} className="shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-sm text-ink-hi">
          {name}
          <span className="ml-2 text-micro text-ink-lo" data-numeric>
            {rarity}%
          </span>
        </p>
        {effect && <p className="text-sm text-ink-mid">{effect}</p>}
      </div>
    </li>
  )
}

/**
 * Where a wild one is found, one game at a time.
 *
 * One request carries every version, so the picker is free — and it is not
 * started in the loader: like the learnset, this sits below the fold.
 */
function Encounters({ pokemon }: { pokemon: Pokemon }) {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: areas } = useSuspenseQuery(encountersQuery(pokemon.id))

  const versions = versionsOf(areas)
  if (versions.length === 0) return null

  const version = search.ver && versions.includes(search.ver) ? search.ver : versions[0]
  const rows = encountersIn(areas, version)

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-micro uppercase text-ink-lo">Where to find</h2>
        <label className="ml-auto flex items-center gap-2 text-micro uppercase text-ink-lo">
          Version
          <select
            value={version}
            onChange={(event) =>
              void navigate({ search: { ...search, ver: event.target.value }, replace: true })
            }
            className="well cursor-pointer px-2 py-1 text-sm text-ink-mid"
          >
            {versions.map((slug) => (
              <option key={slug} value={slug}>
                {humanize(slug)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3">
        <EncounterTable rows={rows} />
      </div>
    </section>
  )
}

/**
 * What every attacking type does to this Pokémon, in the generation asked for.
 *
 * The two charts are different questions, not one with a flag. Today's is read
 * off the defender alone — one or two resources — while a past one needs every
 * attacking type, because only the attacker carries its own history. The
 * defender is scoped too: reading Magnemite with its modern typing against a
 * Gen I chart would answer confidently and wrongly.
 */
function Matchups({ pokemon }: { pokemon: Pokemon }) {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-micro uppercase text-ink-lo">Defensive matchups</h2>
        <div className="ml-auto">
          <GenerationPicker
            value={search.gen}
            onChange={(next) =>
              void navigate({ search: { ...search, gen: next }, replace: true })
            }
          />
        </div>
      </div>
      <Suspense fallback={<Skeleton label="Defensive matchups" />}>
        {search.gen ? (
          <PastChart pokemon={pokemon} generation={search.gen} />
        ) : (
          <CurrentChart pokemon={pokemon} />
        )}
      </Suspense>
    </section>
  )
}

function CurrentChart({ pokemon }: { pokemon: Pokemon }) {
  const { data: chart } = useSuspenseQuery(matchupsQuery(pokemon))
  return <MatchupGroups chart={chart} />
}

function PastChart({ pokemon, generation }: { pokemon: Pokemon; generation: GenerationName }) {
  const { data: types } = useSuspenseQuery(allTypesQuery)
  const defending = typesIn(pokemon, generation).map((slot) => slot.type)

  return <MatchupGroups chart={defensiveProfile(types, defending, { generation })} />
}

function MatchupGroups({ chart }: { chart: MatchupChart }) {
  const { weaknesses, resistances, immunities } = notableMatchups(chart)

  const groups = [
    ['Weak to', weaknesses],
    ['Resists', resistances],
    ['Immune to', immunities],
  ] as const

  return (
    <div className="mt-3 flex flex-col gap-3">
      {groups.map(([label, names]) =>
        names.length === 0 ? null : (
          <div key={label} className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 text-micro uppercase text-ink-lo">{label}</span>
            {names.map((name) => (
              <span key={name} className="flex items-center gap-1">
                <TypeChip name={name} />
                <span className="text-micro text-ink-lo" data-numeric>
                  ×{effectiveness(chart[name] ?? 1)}
                </span>
              </span>
            ))}
          </div>
        ),
      )}
    </div>
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

/**
 * One version group and one learn method at a time.
 *
 * Both pickers are built from the links the Pokémon already carries, so
 * choosing costs nothing until a tab is opened — and only the open tab is
 * resolved. The selection lives in the URL, so a learnset is shareable.
 */
function Learnset({ pokemon }: { pokemon: Pokemon }) {
  const search = Route.useSearch()
  const { vg, learn } = search
  const navigate = Route.useNavigate()

  const groups = versionGroupsOf(pokemon.moves)
  if (groups.length === 0) return null

  const versionGroup = vg && groups.includes(vg) ? vg : (defaultVersionGroup(pokemon.moves) ?? groups[0])
  const methods = learnMethodsOf(pokemon.moves, versionGroup)
  const method = methods.some(({ name }) => name === learn) ? learn : methods[0]?.name

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-micro uppercase text-ink-lo">Moves</h2>
        <label className="ml-auto flex items-center gap-2 text-micro uppercase text-ink-lo">
          Version
          <select
            value={versionGroup}
            // A method belongs to its version group, so picking a group clears it.
            onChange={(event) =>
              void navigate({
                search: { ...search, vg: event.target.value, learn: undefined },
                replace: true,
              })
            }
            className="well cursor-pointer px-2 py-1 text-sm text-ink-mid"
          >
            {groups.map((group) => (
              <option key={group} value={group}>
                {humanize(group)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Learn method">
        {methods.map(({ name, count }) => (
          <button
            key={name}
            type="button"
            aria-pressed={name === method}
            onClick={() =>
              void navigate({
                search: { ...search, vg: versionGroup, learn: name },
                replace: true,
              })
            }
            className={`well px-2.5 py-1 text-sm ${
              name === method ? 'text-ink-hi' : 'text-ink-lo hover:text-ink-mid'
            }`}
          >
            {humanize(name)}
            <span className="ml-2 text-micro text-ink-lo" data-numeric>
              {count}
            </span>
          </button>
        ))}
      </div>

      {method && (
        <div className="mt-3">
          <Suspense fallback={<Skeleton label="Moves" lines={5} />}>
            <LearnsetTable pokemon={pokemon} versionGroup={versionGroup} method={method} />
          </Suspense>
        </div>
      )}
    </section>
  )
}

function LearnsetTable({
  pokemon,
  versionGroup,
  method,
}: {
  pokemon: Pokemon
  versionGroup: string
  method: string
}) {
  const { data: moves } = useSuspenseQuery(learnsetQuery(pokemon, versionGroup, method))
  if (moves.length === 0) return <p className="text-sm text-ink-lo">Nothing learned this way.</p>

  return <MoveTable moves={moves} />
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
