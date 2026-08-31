import { Suspense, type CSSProperties } from 'react'
import { noop, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import type { GenerationName } from 'pokenode-ts'
import { pokemonQuery, speciesQuery } from '@/api/queries/pokemon'
import { evolutionChainQuery } from '@/api/queries/evolution'
import { matchupsQuery } from '@/api/queries/types'
import { cached, isNotFound } from '@/api/query-client'
import { Abilities } from '@/components/dex/Abilities'
import { BaseStats } from '@/components/dex/BaseStats'
import { Encounters } from '@/components/dex/Encounters'
import { Evolution } from '@/components/dex/Evolution'
import { HeldItems } from '@/components/dex/HeldItems'
import { Learnset } from '@/components/dex/Learnset'
import { Matchups } from '@/components/dex/Matchups'
import { SpriteViewer } from '@/components/dex/SpriteViewer'
import { TypeChip } from '@/components/dex/TypeChip'
import { Vitals } from '@/components/dex/Vitals'
import { DetailHeader } from '@/components/ui/DetailHeader'
import { NotFound } from '@/components/ui/NotFound'
import { Skeleton } from '@/components/ui/Skeleton'
import { cleanFlavorText, dexNo, generationLabel, humanize } from '@/lib/format'
import { useLocalized } from '@/hooks/use-language'
import { compact, optionalGeneration, optionalString } from '@/lib/search-params'
import { typesIn } from '@/lib/pokemon/past-types'
import { typeVar } from '@/lib/types'

interface DetailSearch {
  vg?: string
  learn?: string
  ver?: string
  gen?: GenerationName
}

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch: (input: Record<string, unknown>): DetailSearch =>
    compact({
      vg: optionalString(input.vg),
      learn: optionalString(input.learn),
      ver: optionalString(input.ver),
      gen: optionalGeneration(input.gen),
    }),
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
  notFoundComponent: () => <UnknownPokemon />,
  pendingComponent: () => <Skeleton label="Loading" lines={6} />,
})

/**
 * The page is layout and the URL; every panel below is its own component.
 *
 * The three panels that answer to a search param take it as a prop rather than
 * reading the route themselves — a panel that names the route mounting it is
 * not extracted. All four params are spread on every `navigate`, so choosing
 * one never clears another.
 */
function PokemonDetail() {
  const { name } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { gen } = search
  const { data: pokemon } = useSuspenseQuery(pokemonQuery(name))
  const { data: species } = useSuspenseQuery(speciesQuery(pokemon))

  // The typing the chosen generation knew, which is not always today's.
  const types = typesIn(pokemon, gen)
  const tint = typeVar(types[0]?.type.name ?? '')
  const style = { '--t': tint } as CSSProperties
  const displayName = useLocalized(species.names)?.name ?? humanize(pokemon.name)
  const genus = useLocalized(species.genera)?.genus
  const flavor = useLocalized(species.flavor_text_entries)?.flavor_text

  const refine = (next: Partial<DetailSearch>) =>
    void navigate({ search: { ...search, ...next }, replace: true })

  return (
    <article className="mx-auto flex w-full max-w-280 flex-col gap-6" style={style}>
      <DetailHeader
        id={dexNo(pokemon.id)}
        title={displayName}
        subtitle={genus && <p className="text-ink-lo">{genus}</p>}
        aside={
          <>
            {gen && types !== pokemon.types && (
              <span className="text-micro uppercase text-ink-lo">
                as of {generationLabel(gen ?? '')}
              </span>
            )}
            {types.map((slot) => (
              <TypeChip key={slot.slot} name={slot.type.name} />
            ))}
          </>
        }
      />

      <div className="detail-grid">
        {/*
         * Below `lg` the two columns dissolve — `contents` drops this wrapper as
         * a box, so its panels become grid items in their own right and can be
         * ordered against the ones opposite. A phone then reads specimen,
         * description, stats, and meets the paperwork afterwards, instead of
         * scrolling past 550px of sprite and figures to reach the first stat.
         */}
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <SpriteViewer id={pokemon.id} name={displayName} tint={tint} />
          <div className="order-3 flex min-w-0 flex-col gap-4 lg:order-none lg:contents">
            <Vitals pokemon={pokemon} species={species} />
            {pokemon.held_items.length > 0 && (
              <Suspense fallback={<Skeleton label="Held items" />}>
                <HeldItems pokemon={pokemon} />
              </Suspense>
            )}
          </div>
        </div>

        <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-none">
          {flavor && (
            <div className="panel p-4">
              {/* The panel holds the column; the measure holds the line length. */}
              <p className="max-w-[62ch] text-ink-mid italic">{cleanFlavorText(flavor)}</p>
            </div>
          )}
          <BaseStats pokemon={pokemon} tint={tint} />
          <Abilities pokemon={pokemon} />
          <Matchups
            pokemon={pokemon}
            generation={gen}
            onGenerationChange={(next) => refine({ gen: next })}
          />
          <Suspense fallback={<Skeleton label="Evolution" lines={2} />}>
            <Evolution species={species} current={species.name} />
          </Suspense>
          <Learnset
            pokemon={pokemon}
            requestedGroup={search.vg}
            requestedMethod={search.learn}
            onSelect={({ vg, learn }) => refine({ vg, learn })}
          />
          <Suspense fallback={<Skeleton label="Where to find" lines={3} />}>
            <Encounters
              pokemon={pokemon}
              requested={search.ver}
              onSelect={(ver) => refine({ ver })}
            />
          </Suspense>
        </div>
      </div>
    </article>
  )
}

function UnknownPokemon() {
  const { name } = Route.useParams()
  return (
    <NotFound eyebrow="404 · not retried" back={{ to: '/pokemon', label: 'Back to the dex' }}>
      The PokéAPI knows no Pokémon called <span className="font-mono">{name}</span>.
    </NotFound>
  )
}
