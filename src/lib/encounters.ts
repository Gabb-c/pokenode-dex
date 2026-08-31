import { VERSIONS, type LocationArea, type LocationAreaEncounter, type NamedAPIResource } from 'pokenode-ts'

/**
 * Versions by release, from the library's own table.
 *
 * A handful of keys are deprecated aliases of ids already present, so the map
 * holds slugs the endpoint no longer publishes. They are inert: nothing looks a
 * slug up that the encounter payload did not carry.
 */
const ORDER = new Map<string, number>(
  Object.entries(VERSIONS).map(([key, id]) => [key.toLowerCase().replaceAll('_', '-'), id]),
)

/**
 * The ids are the order the endpoint assigned, which is release order except
 * where a version was added late: the Japan-only Gen 1 releases carry ids past
 * Gen 9, and the Shield and Violet halves of four expansions were filed after
 * their Sword and Scarlet twins rather than beside them. Left alone, an Isle of
 * Armor encounter would sort as the newest game a Pokémon appears in.
 */
ORDER.set('red-japan', 0.1)
ORDER.set('green-japan', 0.2)
ORDER.set('blue-japan', 0.3)
ORDER.set('the-isle-of-armor-shield', 35.5)
ORDER.set('the-crown-tundra-shield', 36.5)
ORDER.set('the-teal-mask-violet', 42.5)
ORDER.set('the-indigo-disk-violet', 43.5)

/** Unknown to this version of the library — sorted past the ones it knows, never dropped. */
const UNKNOWN = -1

function orderOf(slug: string): number {
  return ORDER.get(slug) ?? UNKNOWN
}

export interface EncounterRow {
  area: NamedAPIResource<LocationArea>
  method: string
  chance: number
  minLevel: number
  maxLevel: number
  /** Time of day, weather, a story flag — whatever the game gates the slot behind. */
  conditions: string[]
}

/**
 * The versions this Pokémon is recorded in, newest first.
 *
 * One request carries every version, so the picker is built from the payload
 * rather than from a list endpoint.
 */
export function versionsOf(areas: readonly LocationAreaEncounter[]): string[] {
  const slugs = new Set<string>()
  for (const area of areas) {
    for (const detail of area.version_details) slugs.add(detail.version.name)
  }
  return [...slugs].sort((a, b) => orderOf(b) - orderOf(a))
}

/**
 * One row per area and method, from the many slots the endpoint splits them
 * into: the same patch of grass is listed once per level and per condition, and
 * a table of forty near-identical rows says less than a table of four.
 */
export function encountersIn(
  areas: readonly LocationAreaEncounter[],
  version: string,
): EncounterRow[] {
  const rows = new Map<string, EncounterRow>()

  for (const area of areas) {
    for (const detail of area.version_details) {
      if (detail.version.name !== version) continue

      for (const encounter of detail.encounter_details) {
        const method = encounter.method.name
        const key = `${area.location_area.name}/${method}`
        const row = rows.get(key)
        const conditions = encounter.condition_values.map((value) => value.name)

        if (!row) {
          rows.set(key, {
            area: area.location_area,
            method,
            chance: encounter.chance,
            minLevel: encounter.min_level,
            maxLevel: encounter.max_level,
            conditions,
          })
          continue
        }

        // The slots of one method are alternatives, so their chances add up.
        row.chance = Math.min(100, row.chance + encounter.chance)
        row.minLevel = Math.min(row.minLevel, encounter.min_level)
        row.maxLevel = Math.max(row.maxLevel, encounter.max_level)
        for (const condition of conditions) {
          if (!row.conditions.includes(condition)) row.conditions.push(condition)
        }
      }
    }
  }

  return [...rows.values()].sort(
    (a, b) => b.chance - a.chance || a.area.name.localeCompare(b.area.name),
  )
}
