# Pokenode·Dex

A real Pokédex, built to show what [pokenode-ts](https://pokenode-ts.vercel.app/)
does in an actual application — not a playground.

Every headline feature of the library has a job here. Nothing is called just to
prove it exists:

| Feature | Where it earns its place |
|---|---|
| Typed endpoints | Everywhere. No `any`, no hand-written response types. |
| `WebStorageCache` + `revalidate` | A cold reload paints from `localStorage`, then 304-revalidates. |
| `.with({ signal, timeout })` | Fed the `AbortSignal` TanStack Query hands every `queryFn`. |
| `resolveAll()` | Type matchups and the effectiveness chart — N typed link fetches, one query. |
| `paginate()` | One walk of `listPokemons` builds the search index the filters and palette read. |
| `localize()` | Names, genera and flavour text, in the language the API published them. |
| `getPokemonSpriteUrl()` | Grid artwork with no extra request, and the sprite viewer's set/shiny/back/female switcher. |
| `PokenodeError` | Decides Query's retry policy and renders the error UI. |
| `logger` | Feeds the status rail along the bottom of every page. |

## Architecture

Two cache tiers, with responsibilities split rather than duplicated:

|  | **L1 — TanStack Query** | **L2 — pokenode-ts** |
|---|---|---|
| Lives in | memory | `localStorage` |
| Keyed by | `queryKey` | request URL |
| Survives reload | no | **yes** |
| TTL | 5 min (`staleTime`) | 24 h |
| On stale | refetch → hits L2 → 304 | conditional GET |
| Cleared by | `queryClient.clear()` | `api.clearCache()` |

Two rules fall out of that, both easy to get wrong:

- **L1's TTL must stay at or below L2's.** Otherwise Query serves data it believes
  fresh while the tier beneath it has already dropped it, and a refetch it thought
  cheap pays for a full round trip.
- **Clearing one tier alone does nothing visible.** Dropping Query refills it from
  L2 on the next render. `clearAllCaches()` in `src/api/query-client.ts` is the
  only correct way, and it is what the rail's button calls.

Retry lives in exactly one place. pokenode-ts defaults it off and Query owns the
policy, so nothing is backed off twice — and a 404 is never retried at all.

`src/routes/about.tsx` is a tour of all of this that imports its own snippets
with Vite's `?raw`, so the code on that page is the code that is running.

## Stack

Vite 8 · React 19 (with the React Compiler) · TypeScript 7 · TanStack Router ·
TanStack Query · TanStack Virtual · Tailwind v4 · oxlint · Vitest

## Running it

```bash
pnpm install
pnpm dev
```

| Script | |
|---|---|
| `pnpm dev` | dev server |
| `pnpm build` | typecheck and bundle |
| `pnpm test` | unit and transport-tier tests |
| `pnpm lint` | oxlint |
| `pnpm check:contrast` | asserts every colour pairing clears 4.5:1 |
| `pnpm check` | all of the above |

## Design

The visual system — the token architecture, how the eighteen type colours are
derived, and the accessibility contract — is documented in [design.md](./design.md).

## Data

All data comes from [PokéAPI](https://pokeapi.co/). The app is deliberately
gentle with it: the grid renders a thousand cards from list links alone rather
than resolving each one, and `paginate`/`resolveAll` keep their concurrency caps.
