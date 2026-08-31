import type { LocationArea, NamedAPIResource, Pokemon } from 'pokenode-ts'

export interface AreaEncounter {
  pokemon: NamedAPIResource<Pokemon>
  /** The area the row belongs to; several are shown at once. */
  area: string
  method: string
  chance: number
  minLevel: number
  maxLevel: number
}

/**
 * The versions a region's areas record encounters for, newest last as the
 * endpoint lists them.
 *
 * Built from the payload rather than a list endpoint, exactly as the Pokémon
 * side's picker is — the areas already carry every version they know.
 */
export function versionsIn(areas: readonly LocationArea[]): string[] {
  const slugs = new Set<string>()
  for (const area of areas) {
    for (const encounter of area.pokemon_encounters) {
      for (const detail of encounter.version_details) slugs.add(detail.version.name)
    }
  }
  return [...slugs]
}

/**
 * Who lives in a location, in one game.
 *
 * The inverse of the Pokémon page's table: that one folds an area's slots for a
 * single species, and this folds a species' slots for a single area. Both
 * collapse the same duplication — the endpoint lists one slot per level band
 * and per condition, and forty near-identical rows say less than four.
 */
export function encountersIn(
  areas: readonly LocationArea[],
  version: string,
): AreaEncounter[] {
  const rows = new Map<string, AreaEncounter>()

  for (const area of areas) {
    for (const encounter of area.pokemon_encounters) {
      for (const detail of encounter.version_details) {
        if (detail.version.name !== version) continue

        for (const slot of detail.encounter_details) {
          const method = slot.method.name
          const key = `${area.name}/${encounter.pokemon.name}/${method}`
          const row = rows.get(key)

          if (!row) {
            rows.set(key, {
              pokemon: encounter.pokemon,
              area: area.name,
              method,
              chance: slot.chance,
              minLevel: slot.min_level,
              maxLevel: slot.max_level,
            })
            continue
          }

          // The slots of one method are alternatives, so their chances add up.
          row.chance = Math.min(100, row.chance + slot.chance)
          row.minLevel = Math.min(row.minLevel, slot.min_level)
          row.maxLevel = Math.max(row.maxLevel, slot.max_level)
        }
      }
    }
  }

  return [...rows.values()].sort(
    (a, b) => b.chance - a.chance || a.pokemon.name.localeCompare(b.pokemon.name),
  )
}
