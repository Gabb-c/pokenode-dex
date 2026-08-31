# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Pokédex whose real purpose is to demonstrate [pokenode-ts](https://pokenode-ts.vercel.app/)
in a working app. Every library feature on the README table has a job here, and
`src/routes/about.tsx` is a guided tour of them. That framing drives design
decisions that would otherwise look odd: the transport's behaviour (cache hits,
304s, cancellations) is *content*, surfaced in a permanent status rail, not
something to hide.

`README.md` covers the feature-to-code mapping; `DESIGN.md` covers the visual
system and the accessibility contract. Read `DESIGN.md` before touching CSS,
tokens, or anything colour-related.

## Commands

pnpm only (`pnpm-lock.yaml` + `pnpm-workspace.yaml`; the other lockfiles in the
listing are shell artefacts, not real).

| | |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | `tsc -b` across all three tsconfig projects, then bundle |
| `pnpm lint` | oxlint |
| `pnpm test` | Vitest, **watch mode** |
| `pnpm vitest run` | one-shot run |
| `node tools/check-contrast.mjs` | asserts all 134 colour pairings clear 4.5:1 |

Single test file: `pnpm vitest run src/lib/format.test.ts`.
One project: `pnpm vitest run --project unit` (or `dom`).

**Known drift:** `README.md` documents `pnpm check` and `pnpm check:contrast`.
Neither script exists in `package.json` — run the contrast check via `node`
directly. `msw` is a devDependency but nothing imports it; the transport tests
stub `fetch` instead.

## Architecture

### Two cache tiers, with one hard invariant

- **L1 — TanStack Query** (`src/api/query-client.ts`): in memory, keyed by
  `queryKey`, `staleTime` 5 min.
- **L2 — pokenode-ts transport** (`src/api/client.ts`): `localStorage` via
  `WebStorageCache`, keyed by request URL, TTL 24 h, `revalidate: true` so an
  expired entry costs a 304 rather than a body.

Invariants that are easy to break:

1. **L1's `staleTime` must stay ≤ L2's TTL.** Otherwise Query serves data it
   believes fresh while the tier beneath has dropped it, and a refetch it
   thought cheap pays a full round trip.
2. **Retry lives in exactly one place — Query.** `MainClient` leaves `retry`
   unset deliberately. Do not add a transport-level retry; failures would be
   backed off twice. `isNotFound` / `isClientError` keep 4xx unretried.
3. **Clearing one tier does nothing visible.** Dropping Query refills it from L2
   on the next render. `clearAllCaches()` is the only correct path, and it is
   what the rail's button calls.

Every `queryFn` receives Query's `AbortSignal` and passes it to `scoped(signal)`
(`src/api/client.ts`), which is `api.with({ signal, timeout })`. New queries
should follow that shape — never call `api.*` directly from a query.

### Query definitions

All in `src/api/queries/*.ts` as `queryOptions` factories, never inline in
components. Reference data (`generations`, `languages`, `all-types`,
`damage-classes`, `search-index`, `move-index`, `pokedexes`, encounters,
abilities, held items, member sets) uses `staleTime: Infinity`.

The move list shows a type and a class per row without resolving a single move:
`allTypesQuery` and `allDamageClassesQuery` carry the moves that belong to them,
and `indexMoves` (`src/lib/moves/filter.ts`) reads the grid backwards off those
two cached queries. Resolving ~940 moves to fill the same columns is the thing
that must not be reintroduced.

A regional Pokédex (`src/routes/games.$dex.tsx`) is one `getPokedexByName` and
nothing else. `entriesOf` (`src/lib/dex/pokedex.ts`) joins its entries to the
cached search index **by species id**, because a species slug is not a Pokémon
slug — the species `deoxys` is the Pokémon `deoxys-normal`, and linking the
former 404s. The result is `DexEntry[]` carrying the *regional* number in `no`,
so `filterDex` and `DexGrid` are reused unchanged.

### Where code lives

`src/lib` is split by domain, and the split is load-bearing rather than tidy:

| | |
|---|---|
| `lib/battle/` | `engine`, `damage`, `moveset`, `stats` — the duel |
| `lib/dex/` | `filter`, `match`, `pokedex`, `silhouette` |
| `lib/moves/` | `filter`, `learnset` |
| `lib/pokemon/` | `encounters`, `past-types` |
| `lib/*.ts` | cross-cutting only: `format`, `generation`, `types`, `storage`, `records`, `search-params`, `palette`, `extract-declaration` |
| `src/hooks/` | every React-bound module, named `use-*` after its hook |

A store that exists to feed a hook lives beside that hook, not in `lib` —
`paintBrowserChrome` sits in `hooks/use-theme.ts` for that reason.

**A `<section className="panel">` is a component, not route layout.** A route
owns its loader, its URL shape and its grid; each panel is its own file under
`src/components/`. A panel that answers to a search param takes it as a **prop**
— a component reaching for `useSearch({ from: '/some/route' })` is not actually
extracted, and the route stays the only place that knows the URL shape.

### External stores

Five `useSyncExternalStore`-style singletons, all outside React:
`transportLog` (`src/api/transport-log.ts`), `stats`/`resetStats`
(`src/api/client.ts`), `l1Hits` (`src/api/query-client.ts`), theme
(`src/hooks/use-theme.ts`), language (`src/hooks/use-language.ts`). Snapshots must keep a
stable identity between commits — `stats()` only swaps the held tally once a
count has actually moved. Preserve that when editing.

The three tallies answer different questions and must not be merged: `stats()`
is the transport's own count of network/cache/304, `TransportSnapshot.inFlight`
is outstanding *requests* (`ClientStats.inFlight` is callers that joined one),
and `l1Hits` counts queries served from Query's memory — which the transport
can never see, because they never reach it.

Every `localStorage` key is prefixed `pokenode-dex:`, and every read/write is
wrapped in try/catch (privacy modes throw outright; tests have no storage).
`src/lib/storage.ts` owns both rules and exports `PREFIX`; the transport's
`WebStorageCache` is the one writer outside those helpers and imports it rather
than repeating the literal.

### Routing

TanStack Router, file-based. `src/routeTree.gen.ts` is **generated** — never
edit it. The generator runs as a Vite plugin, and in `vite.config.ts` it must
stay **first**, before the React transforms that compile its output.

Filters live in the URL as typed search params (`validateSearch` in
`src/routes/pokemon.index.tsx`, `src/routes/moves.index.tsx`), so any view is
shareable. `src/routes/pokemon.$name.tsx` carries four of them (vg, learn, ver,
gen), so every `navigate` there has to spread the current search rather than
replace it. Every param is absent rather than empty, so an unfiltered view has a
clean URL.

### `about.tsx` reads the source

`src/routes/about.tsx` imports real files with Vite's `?raw` and slices out
named declarations via `extractDeclaration`. Renaming an exported binding in
`src/api/client.ts`, `src/api/query-client.ts`, `src/api/queries/search-index.ts`,
`src/api/queries/types.ts`, `src/api/queries/moves.ts`,
`src/api/queries/games.ts`, `src/lib/pokemon/past-types.ts`,
`src/hooks/use-language.ts`, or `src/components/dex/PokemonCard.tsx`
breaks a snippet on that page — and it
breaks *quietly*, because `extractDeclaration` falls back to the whole file
rather than throwing. `src/routes/-features.test.ts` is the guard: it asserts
every snippet still opens with its own `extract` marker. Update the `extract`
string in `FEATURES` when you rename one, and run that test.

The table itself lives in `src/routes/-features.ts`, not in the route — a
module that calls `createFileRoute` only typechecks inside the app project,
which is the one carrying the router's `Register` augmentation. The `-` prefix
keeps the route generator out of it.

## Styling rules

Tailwind v4, CSS-first. There is no `tailwind.config.js` and there should not be
one. Tokens live in `src/styles/theme.css`; component classes in
`src/index.css`.

- **A `dark:` variant is a missing token.** Components use semantic tokens
  (`bg-surface-1`, `text-ink-mid`, `border-line`) so the theme flip is automatic.
  Reach for the variant only where a token cannot express it.
- **Type colour never becomes a class name.** Tailwind extracts statically, so
  `` bg-type-${name} `` emits nothing. Pass it as the `--t` custom property:
  `style={{ '--t': typeVar(name) } as CSSProperties}`. `typeVar()`
  (`src/lib/types.ts`) is the single name→token map.
- **A repeated class string is a missing component class.** `.panel`, `.well`,
  `.btn`, `.btn-accent`, `.type-chip` and `.detail-grid` live in `src/index.css`
  and are written as raw properties, never `@apply`-ing each other. Radii come
  from `--radius-panel` / `--radius-well` / `--radius-control`; a bare
  `rounded-[3px]` is drift.
- A repeated *markup shape* is a missing component: `components/ui/Select` owns
  the label-plus-`<select>` pairing, and the element stays a bare `<select>` so
  the coarse-pointer floor in `index.css` still reaches it.
- Hand-written CSS points at the **raw** tokens (`var(--surface-1)`), not the
  `--color-*` aliases — Tailwind only emits an alias when a utility class uses it.
- Changing any colour requires `node tools/check-contrast.mjs` to still pass. It
  parses the shipped `theme.css`, so it catches drift.
- Colour is never the only channel: every type chip carries its name. Do not
  drop the label to save space.

## TypeScript

Three project references (`tsconfig.app.json` / `node.json` / `test.json`).
App config **excludes** `src/**/*.test.ts`; tests typecheck under the test
project, which is the one that has `node` and `@testing-library/jest-dom` types.
`erasableSyntaxOnly` and `verbatimModuleSyntax` are on — no enums, no parameter
properties, `import type` for types. `@/*` aliases `./src/*` in all three plus
both Vite configs.

## Testing

`vitest.config.ts` is deliberately **not** the app's Vite config — the route
generator and the React compiler have no part in a unit run. Two projects:

- `unit` — node env, `src/**/*.test.ts` minus `src/hooks/**`
- `dom` — jsdom + `src/test/setup.ts`, `src/**/*.test.tsx` plus
  `src/hooks/**/*.test.ts`

The split is one **directory**, and `unit` is written as a catch-all minus that
directory on purpose: an enumerated list would let a `.test.ts` in an unlisted
place be collected by neither project and pass by never running. Anything under
`src/hooks` is React-bound by definition and gets jsdom; everything else stays
on node. A `.test.ts` that needs a DOM belongs beside a hook, not in `lib`.
`src/test/setup.ts` polyfills `HTMLDialogElement.showModal`/`close`, which jsdom
30 does not implement at all — the command palette depends on it.

`src/api/cache-tiers.test.ts` asserts the two-tier configuration against a
stubbed `fetch` (ETag/304), not the real PokéAPI. Any change to the caching or
retry configuration should be reflected there.

## Data etiquette

All data is PokéAPI. The app is deliberately gentle with it: the grid renders a
thousand cards from list links plus `getPokemonSpriteUrl` (no per-card request),
and `paginate`/`resolveAll` keep the library's concurrency caps. Do not replace
a `resolveAll` with a hand-rolled fan-out.
