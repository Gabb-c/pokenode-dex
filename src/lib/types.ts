import { TYPES, type TypeName as PokeTypeName } from 'pokenode-ts'

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

export type Matchups = Record<TypeName, number>

/** Only the cells worth showing: neutral matchups carry no information. */
export function notableMatchups(chart: Matchups) {
  const weaknesses: TypeName[] = []
  const resistances: TypeName[] = []
  const immunities: TypeName[] = []

  for (const name of BATTLE_TYPES) {
    const multiplier = chart[name]
    if (multiplier === 0) immunities.push(name)
    else if (multiplier > 1) weaknesses.push(name)
    else if (multiplier < 1) resistances.push(name)
  }
  return { weaknesses, resistances, immunities }
}
