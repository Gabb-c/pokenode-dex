# pokenode-ts — consumer feedback report

**For:** an agent working in `/home/gabb-c/My-Stuff/repositories/pokenode-ts`
**Branch under review:** `feat/type-chart-and-evolution-helpers` (one WIP commit, `7565bcc`, ahead of `main`)
**Source of findings:** building a real consumer app against `pokenode-ts@2.2.0`

## Where these findings came from

They are not a code read. They come from building **Pokenode·Dex**
(`/home/gabb-c/My-Stuff/repositories/pokenode-dex`), a working Pokédex whose
explicit purpose is to exercise every headline feature of the library under real
application conditions — TanStack Query for React state, `pokenode-ts` owning the
transport.

Everything below is either something the app **had to hand-roll** because the
library had no answer, or something in the WIP branch that would **delete code
the app currently ships**. Each item names the consumer file so you can see the
real usage rather than a hypothetical.

Two things to know before acting:

- The consumer app is fully typechecked, linted and tested (57 tests), so the
  hand-rolled code referenced here is real, working code, not a sketch.
- **Findings were produced in an environment with no network access to
  `pokeapi.co`.** Anything requiring live data is marked
  `NEEDS LIVE VALIDATION` and must be checked with `pnpm test:live` before you
  act on it. Do not treat those as established.

---

## Already resolved on this branch — do not redo

**`EvolutionTimeOfDay`.** The app hit this: released `2.2.0` types
`time_of_day` as `"" | "Day" | "Night"`, but the API sends lower case. The
consumer app carries a `.toLowerCase()` because of it.

This branch already fixes it — `src/models/evolution/evolution.ts:16` declares
`"day" | "night" | "dusk" | "full-moon"`, correctly cased, and adds `dusk` and
`full-moon`, which the released union omits entirely (Lycanroc dusk form,
Ursaluna). `tests/live/values.live.spec.ts` documents the gap that let it
through.

No action. Recorded so it is not re-investigated.

---

# Part A — gaps the app had to fill itself

## A1. `resourceId(link)` — the id inside a resource URL

**Status:** verified, no live data needed. **Highest value item in this report.**

`getPokemonSpriteUrl(id)` (`src/utils/sprites.ts:56`) takes a numeric id, and its
own docstring says names are not addressable. Every list endpoint returns
`NamedAPIResource` — `{ name, url }`, no id. **The library ships a function whose
input it gives you no supported way to produce.**

The consumer app needed this in four separate places and wrote it by hand:

- `src/lib/resource-id.ts` — the helper
- `src/api/queries/search-index.ts` — list links → dex entries
- `src/api/queries/games.ts` — `generation.pokemon_species` → id set
- `src/api/queries/types.ts` — `type.pokemon[].pokemon` → id set
- `src/components/dex/EvolutionGraph.tsx` — `link.species` → sprite

This is load-bearing for a real pattern: the dex grid renders ~1300 cards from
list links alone, with **zero** extra requests, by deriving the id and handing it
to `getPokemonSpriteUrl`. Without an id helper the alternative is resolving 1300
resources, which the library's own fair-use posture discourages.

**Proposed:**

```ts
export const resourceId = (resource: ResourceLink<unknown>): number
```

Accept the same `ResourceLink` union `resolve()` already takes (string |
`NamedAPIResource` | `APIResource`) for consistency. Throw `TypeError` on a URL
with no trailing id, matching `resolve()`'s documented behaviour for an
unparseable URL.

Reference implementation (`pokenode-dex/src/lib/resource-id.ts`):

```ts
const match = /\/(\d+)\/?$/.exec(url)
if (!match) throw new TypeError(`No resource id in URL: ${url}`)
return Number(match[1])
```

**Acceptance:** unit tests for a trailing slash, no trailing slash, a bare URL
string, both resource shapes, and a URL with no id (throws).

---

## A2. `localize` fallback, and version-scoped flavor text

**Status:** verified for the fallback. The flavor-text half is a **real bug the
consumer app knowingly shipped**.

`localize` (`src/utils/localize.ts:34`) returns `undefined` when a language is
absent and deliberately guesses nothing — correct, and the docstring says so. But
it means every consumer writes the same chain. The app's
(`src/lib/language.ts`, `useLocalized`):

```ts
localize(entries, language) ?? localize(entries, 'en') ?? entries[0]
```

**Proposed:** an options form, `localize(entries, { language, fallback: 'en' })`,
keeping the current positional signature working.

**The more important half.** `localize`'s own docstring warns:

> A section may list several entries for one language — flavor text, one per
> version — and the first is the one returned. Filter first when you want a
> particular version.

The app did **not** filter first (`src/routes/pokemon.$name.tsx`, the `flavor`
binding), so it displays an arbitrary version's Pokédex entry. That is a bug
caused by the library documenting a hazard rather than offering the affordance.

**Proposed:** either
- `localizeAll(entries, language)` returning every match, letting the caller pick; or
- a `versionGroup` option on `localize` for entries carrying `version_group`.

**Acceptance:** a test proving flavor text for a species with entries across many
version groups returns the requested one, not the first.

---

## A3. A `TypeName` union

**Status:** verified, no live data needed.

This branch adds `GenerationName` (`src/constants/games.ts:23`) and the models
carry `EvolutionTriggerName` (`src/models/evolution/evolution.ts:139`). There is
no equivalent for types, though `TYPES` (`src/constants/pokemon.ts:123`) is the
same shape of closed set.

The consumer app had to declare its own 18-member union
(`pokenode-dex/src/lib/types.ts`) to type anything touching a type name, and to
filter out `UNKNOWN` and `SHADOW`, which are side-game artefacts that never
appear in a matchup.

**Proposed:** `export type TypeName` in `src/constants/pokemon.ts`, written out
for the same reason `GenerationName` is. Consider whether it should cover only
the eighteen battle types — every consumer building a chart wants that set, and
`TYPES` currently forces them to filter by id.

**Acceptance:** `defensiveProfile` and `effectiveness` are typed in terms of it
(see B3).

---

## A4. Cache statistics — optional, high demo value

**Status:** verified. Lowest priority here; recorded because of its outsized
effect on demonstrating the library.

The `source` field on `LogResponsePayload` — `network` / `cache` / `in-flight` /
`revalidated` — is **the single most valuable thing in the library for proving
the cache works.** Nothing else can distinguish a cache hit from a 304 from a
real round trip once the promise resolves.

The consumer app built a persistent status rail on it
(`pokenode-dex/src/api/transport-log.ts`, `src/components/chrome/StatusRail.tsx`)
and had to write the whole ring-buffer and tally layer: in-flight tracking, per-
source counters, and the `network + revalidated` sum that gives the round trips
the API actually saw.

**Proposed:** an optional `api.stats` exposing counts by source, so
"prove your cache works" is a property read rather than a logger adapter. Keep
the logger as the general mechanism.

---

# Part B — critiques of the WIP branch

The branch is good. `requirementsOf` and the `EvolutionRequirement` union are the
strongest additions: they directly replace ~20 hand-rolled nullable-field checks
in the consumer app (`pokenode-dex/src/api/queries/evolution.ts`,
`evolutionConditions`) and revealed that the app was **silently dropping about a
dozen evolution methods** — `used-move`, `min-move-count`, `min-steps`,
`min-damage-taken`, `region`, `party-species`, `party-type`, `trade-species`,
`base-form`, `evolved-form`, `needs-multiplayer`, `near-special-rock`.

The `versionGroup` docstring on `flattenChain` (the tag is the game that
*introduced* the method, so filtering to `sword-shield` drops Vaporeon) is the
kind of caveat that saves consumers hours. Keep it as written.

The three items below are the ones worth changing.

## B1. `defensiveProfile` costs ~9× more requests than its headline use case needs

**Status:** `NEEDS LIVE VALIDATION` — the reasoning is sound and the consumer app
ships the cheaper path, but the symmetry claim must be confirmed against live
data before you change anything.

`defensiveProfile` (`src/utils/type-chart.ts:147`) is documented as the
*"what is this Pokémon weak to"* table. It reads only the **offensive** arrays —
`multiply` → `against` → `MULTIPLIERS` (`src/utils/type-chart.ts:15-34`) uses
`no_damage_to` / `half_damage_to` / `double_damage_to`. So it needs **all
eighteen** `Type` resources resolved.

The same answer is available from the **defending** type's own
`double_damage_from` / `half_damage_from` / `no_damage_from`, which needs only
the one-or-two types the Pokémon already links to. That is what the consumer app
ships (`pokenode-dex/src/lib/types.ts`, `defensiveMatchups`, fed by
`resolveAll(pokemon.types.map(slot => slot.type))` in
`pokenode-dex/src/api/queries/types.ts`): **two requests instead of eighteen** for
a dual-type Pokémon.

**The 18-type form is still necessary** when `generation` is passed — you need
each attacker's `past_damage_relations`, and you need to tell "this type did not
exist yet" apart from "neutral", which the defender-side arrays cannot express.
That is a real justification for the current design. It is not a justification
for it being the *only* path.

**Validate first.** The claim rests on PokéAPI's damage relations being
symmetric: `X.double_damage_from` contains exactly the `Y` where
`Y.double_damage_to` contains `X`. Write a live test asserting that across all
eighteen types, in `tests/live/`, and run `pnpm test:live`.

- **If symmetric:** add a defender-side path — an overload or a sibling
  (`defensiveProfileFrom(defending: readonly Type[])`) — and say in both
  docstrings which to reach for and why.
- **If not symmetric:** stop. Document the asymmetry instead, and treat the
  consumer app's implementation as a bug to report back.

**Acceptance:** the common case (no `generation`) is reachable with only the
defending Pokémon's own types resolved, and the two paths agree on a sample of
single- and dual-type Pokémon including an immunity (Gengar/normal) and a ×4
(Ferrothorn/fire).

## B2. The `phrase` table is not exported

**Status:** verified, no live data needed.

`formatRequirements` (`src/utils/evolution.ts:420`) is correctly isolated as
"the only English in the library", and the docstring tells consumers to drop it
and use `requirementsOf` if they render their own copy. Good instinct.

But `phrase` (`src/utils/evolution.ts:340`) is module-private, so the escape
hatch is all-or-nothing: to change a single word, or to render in any other
language, a consumer rebuilds the entire renderer — including the `use-item`
de-duplication logic, which is non-obvious and worth reusing.

**Proposed:** export the phrase table, or accept a partial override:

```ts
formatRequirements(requirements, { phrases: { 'min-happiness': … } })
```

**Acceptance:** a test overriding one `kind` and leaving the rest intact, and a
test that the `use-item` de-duplication still applies under an override.

## B3. `defensiveProfile` returns `Record<string, number>`

**Status:** verified, no live data needed. Depends on A3.

`Record<string, number>` gives up the type safety the rest of the library is
built on — `profile.psychic` and `profile.psychick` both compile, and neither is
caught. The consumer app worked around it with its own union and a
`Record<TypeName, number>`.

**Proposed:** `Partial<Record<TypeName, number>>` once A3 lands. `Partial` is the
honest type: generation scoping legitimately omits entries, which is exactly why
a total `Record` would be wrong.

**Acceptance:** a type-level test that an unknown key is a compile error, and
that a caller must handle `undefined` under a `generation` scope.

---

# Suggested order

1. **A3** (`TypeName`) — small, unblocks B3.
2. **B3** — mechanical once A3 exists.
3. **A1** (`resourceId`) — highest consumer value, self-contained.
4. **B2** (phrase table) — small, unblocks non-English consumers.
5. **A2** (localize) — fallback is easy; the version-scoped half needs a design call.
6. **B1** — **validate before implementing.** Live test first.
7. **A4** — optional.

# Verifying against the real consumer

The consumer app is the evidence for all of this and can be re-pointed at a local
build to confirm a fix actually removes hand-rolled code. If these land, it should
be able to delete:

- `src/lib/resource-id.ts` (A1)
- `evolutionConditions` in `src/api/queries/evolution.ts` (B-preamble)
- `defensiveMatchups` and `notableMatchups` in `src/lib/types.ts` (B1)
- its local `TypeName` union (A3)
- the `.toLowerCase()` on `time_of_day` (already fixed on this branch)

That deletion list is the real acceptance test: if the helpers are pitched at the
right level, a genuine consumer's hand-rolled layer disappears.
