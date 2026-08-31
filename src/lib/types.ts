import { TYPES, type Type, type TypeGameSprites, type TypeName as PokeTypeName } from 'pokenode-ts'

/**
 * The eighteen battle types, in the order the official chart uses.
 *
 * `TYPES` also carries `STELLAR`, `UNKNOWN` and `SHADOW`. None of them is a
 * type a Pokémon can be — Stellar is a Tera type — so they are filtered by id.
 */
export const BATTLE_TYPES = Object.entries(TYPES)
  .filter(([, id]) => id <= 18)
  .map(([name]) => name.toLowerCase()) as readonly TypeName[]

/** `TypeName` less `stellar`, which the library includes and no Pokémon has. */
export type TypeName = Exclude<PokeTypeName, 'stellar'>

const BATTLE_TYPE_SET = new Set<string>(BATTLE_TYPES)

export function isBattleType(name: string): name is TypeName {
  return BATTLE_TYPE_SET.has(name)
}

/**
 * The CSS custom property carrying a type's colour. See the note in index.css.
 *
 * Points at the raw token, not the `--color-type-*` alias: Tailwind only
 * materialises an `@theme inline` variable when a utility class references it,
 * and nothing here does — these are read through `var()` from inline styles.
 */
export function typeVar(name: string): string {
  return isBattleType(name) ? `var(--type-${name})` : 'var(--ink-lo)'
}

/**
 * Partial because a generation-scoped chart leaves out a type that did not
 * exist yet: absent is not the same answer as neutral.
 */
export type Matchups = Partial<Record<TypeName, number>>

/** Only the cells worth showing: neutral matchups carry no information. */
export function notableMatchups(chart: Matchups) {
  const weaknesses: TypeName[] = []
  const resistances: TypeName[] = []
  const immunities: TypeName[] = []

  for (const name of BATTLE_TYPES) {
    const multiplier = chart[name]
    if (multiplier === undefined) continue
    if (multiplier === 0) immunities.push(name)
    else if (multiplier > 1) weaknesses.push(name)
    else if (multiplier < 1) resistances.push(name)
  }
  return { weaknesses, resistances, immunities }
}

/**
 * Newest first, which is the order the icons are worth having in.
 *
 * Generations I and II are absent from the payload — neither game displayed a
 * type icon at all — and only the last two generations published the symbol on
 * its own. Everything before them has the type's *name* drawn as a picture,
 * which is a word in an image and no use to a screen reader, so it is not a
 * fallback this reaches for.
 */
const ICON_GENERATIONS = [
  'generation-ix',
  'generation-viii',
] as const satisfies readonly (keyof Type['sprites'])[]

/**
 * The type's symbol, from the newest game that drew one.
 *
 * Costs nothing: the sprites are a field of the `Type` payload the chart is
 * already read from. A type with no symbol anywhere — Shadow, Stellar and
 * Unknown, none of which is a battle type — answers `undefined`, and the caller
 * shows the chip alone.
 */
export function typeIcon(type: Type): string | undefined {
  for (const generation of ICON_GENERATIONS) {
    // Each generation is an interface keyed by game name rather than an index
    // signature, so the values have to be read structurally.
    const games: TypeGameSprites[] = Object.values(type.sprites[generation])
    for (const game of games) {
      if (game.symbol_icon) return game.symbol_icon
    }
  }
  return undefined
}
