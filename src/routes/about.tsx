import { createFileRoute } from '@tanstack/react-router'
import { extractDeclaration } from '@/lib/extract-declaration'
import clientSource from '@/api/client.ts?raw'
import queryClientSource from '@/api/query-client.ts?raw'
import searchIndexSource from '@/api/queries/search-index.ts?raw'
import typeQueriesSource from '@/api/queries/types.ts?raw'
import moveQueriesSource from '@/api/queries/moves.ts?raw'
import pastTypesSource from '@/lib/past-types.ts?raw'
import languageSource from '@/lib/language.ts?raw'
import cardSource from '@/components/dex/PokemonCard.tsx?raw'

export const Route = createFileRoute('/about')({ component: About })

interface Feature {
  title: string
  blurb: string
  /** Read straight off disk, so a snippet can never drift from the code it documents. */
  source: string
  /** The exported binding to show; the rest of the file is noise here. */
  extract: string
}

const FEATURES: Feature[] = [
  {
    title: 'One transport, one persistent cache',
    blurb:
      'Every section client shares a transport, so a resource fetched through one is served from cache by the rest. The store is localStorage, so it outlives the tab, and revalidate turns an expired entry into a 304 rather than a fresh download.',
    source: clientSource,
    extract: 'export const api',
  },
  {
    title: 'Two tiers that do not fight',
    blurb:
      'TanStack Query owns staleness and retries; pokenode-ts owns the wire. Retry lives in exactly one of them, and PokenodeError decides what is worth retrying at all — a 404 never is.',
    source: queryClientSource,
    extract: 'export const queryClient',
  },
  {
    title: 'Walking a list endpoint',
    blurb:
      'paginate manages the offset and the limit itself. Three requests give every Pokémon the API knows, which is what lets the filter answer without touching the network again.',
    source: searchIndexSource,
    extract: 'export const searchIndexQuery',
  },
  {
    title: 'Following links',
    blurb:
      'A link carries what it points at, so resolveAll returns Type[] without being told. The concurrency cap is the library keeping the PokéAPI fair-use policy on your behalf.',
    source: typeQueriesSource,
    extract: 'export const matchupsQuery',
  },
  {
    title: 'Choosing what not to follow',
    blurb:
      'A Pokémon carries its whole learnset as links — several hundred of them. The work is narrowing to the twenty a reader asked for before resolveAll follows any, and letting the concurrency cap pace the rest.',
    source: moveQueriesSource,
    extract: 'export const learnsetQuery',
  },
  {
    title: 'The chart a generation actually used',
    blurb:
      'relationsFor reads past_damage_relations, so the type chart can be asked what it looked like in Gen I — and nothing is guessed for a type that did not exist yet. The defender needs the same treatment, which is what this does: a matchup scoped to a generation is only honest if both sides are.',
    source: pastTypesSource,
    extract: 'export function typesIn',
  },
  {
    title: 'One entry per game, in one language',
    blurb:
      'localize picks a single entry and stops. Flavour text is published once per version group, so the question is which of the translated ones — and that needs them all. localizeAll narrows to the language and leaves the choice where it belongs.',
    source: languageSource,
    extract: 'export function useLatestFlavor',
  },
  {
    title: 'Sprites without a request',
    blurb:
      'getPokemonSpriteUrl builds the URL from an id. The grid has ids from the list it already fetched, so a thousand cards cost no extra round trips.',
    source: cardSource,
    extract: 'export function PokemonCard',
  },
]

function About() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header>
        <h1 className="text-2xl tracking-tight">How this app uses pokenode-ts</h1>
        <p className="mt-2 text-sm text-ink-mid">
          Every snippet below is imported from this repository with Vite&rsquo;s{' '}
          <code className="font-mono">?raw</code>, so it is the code that is actually
          running — not a copy that can go stale.
        </p>
      </header>

      {FEATURES.map((feature) => (
        <section key={feature.title} className="flex flex-col gap-3">
          <h2 className="text-lg">{feature.title}</h2>
          <p className="text-sm text-ink-mid">{feature.blurb}</p>
          <pre className="panel overflow-x-auto p-4 text-xs leading-relaxed">
            <code className="font-mono">{extractDeclaration(feature.source, feature.extract)}</code>
          </pre>
        </section>
      ))}
    </div>
  )
}
