/*
 * The about page's table of contents, kept out of `about.tsx` so a test can
 * import it: a module that calls `createFileRoute` only typechecks inside the
 * app project, which is the one that carries the router's `Register`
 * augmentation. The `-` prefix keeps the generator from treating this as a
 * route.
 */
import clientSource from '@/api/client.ts?raw'
import queryClientSource from '@/api/query-client.ts?raw'
import searchIndexSource from '@/api/queries/search-index.ts?raw'
import typeQueriesSource from '@/api/queries/types.ts?raw'
import moveQueriesSource from '@/api/queries/moves.ts?raw'
import pastTypesSource from '@/lib/pokemon/past-types.ts?raw'
import languageSource from '@/hooks/use-language.ts?raw'
import cardSource from '@/components/dex/PokemonCard.tsx?raw'

export interface Feature {
  title: string
  /** The library feature, short enough for a jump chip. Doubles as the anchor. */
  nav: string
  blurb: string
  /** Read straight off disk, so a snippet can never drift from the code it documents. */
  source: string
  /** The exported binding to show; the rest of the file is noise here. */
  extract: string
}

export const anchor = (nav: string) => nav.toLowerCase().replace(/\s+/g, '-')

export const FEATURES: Feature[] = [
  {
    title: 'One transport, one persistent cache',
    nav: 'Transport',
    blurb:
      'Every section client shares a transport, so a resource fetched through one is served from cache by the rest. The store is localStorage, so it outlives the tab, and revalidate turns an expired entry into a 304 rather than a fresh download.',
    source: clientSource,
    extract: 'export const api',
  },
  {
    title: 'Two tiers that do not fight',
    nav: 'Two tiers',
    blurb:
      'TanStack Query owns staleness and retries; pokenode-ts owns the wire. Retry lives in exactly one of them, and PokenodeError decides what is worth retrying at all — a 404 never is.',
    source: queryClientSource,
    extract: 'export const queryClient',
  },
  {
    title: 'Walking a list endpoint',
    nav: 'Pagination',
    blurb:
      'paginate manages the offset and the limit itself. Three requests give every Pokémon the API knows, which is what lets the filter answer without touching the network again.',
    source: searchIndexSource,
    extract: 'export const searchIndexQuery',
  },
  {
    title: 'Following links',
    nav: 'Links',
    blurb:
      'A link carries what it points at, so resolveAll returns Type[] without being told. The concurrency cap is the library keeping the PokéAPI fair-use policy on your behalf.',
    source: typeQueriesSource,
    extract: 'export const matchupsQuery',
  },
  {
    title: 'Choosing what not to follow',
    nav: 'Narrowing',
    blurb:
      'A Pokémon carries its whole learnset as links — several hundred of them. The work is narrowing to the twenty a reader asked for before resolveAll follows any, and letting the concurrency cap pace the rest.',
    source: moveQueriesSource,
    extract: 'export const learnsetQuery',
  },
  {
    title: 'The chart a generation actually used',
    nav: 'Past types',
    blurb:
      'relationsFor reads past_damage_relations, so the type chart can be asked what it looked like in Gen I — and nothing is guessed for a type that did not exist yet. The defender needs the same treatment, which is what this does: a matchup scoped to a generation is only honest if both sides are.',
    source: pastTypesSource,
    extract: 'export function typesIn',
  },
  {
    title: 'One entry per game, in one language',
    nav: 'Language',
    blurb:
      'localize picks a single entry and stops. Flavour text is published once per version group, so the question is which of the translated ones — and that needs them all. localizeAll narrows to the language and leaves the choice where it belongs.',
    source: languageSource,
    extract: 'export function useLatestFlavor',
  },
  {
    title: 'Sprites without a request',
    nav: 'Sprites',
    blurb:
      'getPokemonSpriteUrl builds the URL from an id. The grid has ids from the list it already fetched, so a thousand cards cost no extra round trips.',
    source: cardSource,
    extract: 'export function PokemonCard',
  },
]
