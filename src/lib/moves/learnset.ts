import { VERSION_GROUPS, type Move, type NamedAPIResource, type PokemonMove } from 'pokenode-ts'

/**
 * Version groups by release, from the library's own table.
 *
 * Two of its keys are deprecated aliases of ids already present, so the map
 * holds a few slugs the endpoint no longer publishes. They are inert: nothing
 * looks a slug up that a Pokémon did not carry.
 */
const ORDER = new Map<string, number>(
  Object.entries(VERSION_GROUPS).map(([key, id]) => [key.toLowerCase().replaceAll('_', '-'), id]),
)

/**
 * The ids are the order the endpoint assigned, which is release order except
 * for the two Japan-only Gen 1 groups: the API added them after Gen 9, so they
 * carry ids 28 and 29 and would otherwise sort as the newest games Mew knows.
 * Only `VersionGroup.order` is authoritative, and reading it would cost a fetch
 * per group for a picker that is otherwise free.
 */
ORDER.set('red-green-japan', 0.1)
ORDER.set('blue-japan', 0.2)

/** Unknown to this version of the library — sorted past the ones it knows, never dropped. */
const UNKNOWN = -1

/** Where a version group falls in release order. Shared with the flavour-text picker. */
export function versionGroupOrder(slug: string): number {
  return ORDER.get(slug) ?? UNKNOWN
}

/** The methods worth leading with; anything else follows in alphabetical order. */
const METHODS = ['level-up', 'machine', 'egg', 'tutor']

export interface LearnMethodCount {
  name: string
  count: number
}

export interface LearnsetEntry {
  link: NamedAPIResource<Move>
  /** `0` for every method but level-up, where the API means "not applicable". */
  level: number
}

/**
 * The version groups this Pokémon has any move data for, newest first.
 *
 * Read off the links the Pokémon already carries, so the picker costs nothing.
 */
export function versionGroupsOf(moves: readonly PokemonMove[]): string[] {
  const slugs = new Set<string>()
  for (const entry of moves) {
    for (const detail of entry.version_group_details) slugs.add(detail.version_group.name)
  }
  return [...slugs].sort((a, b) => versionGroupOrder(b) - versionGroupOrder(a))
}

/**
 * The group to open on, which is not simply the newest.
 *
 * The most recent games teach some Pokémon by nothing but `train` — Pikachu in
 * Champions has sixty of those and no level-up list at all. A learnset that
 * opens without one reads as broken, so the newest group that teaches by level
 * wins, and the newest overall is the fallback.
 */
export function defaultVersionGroup(moves: readonly PokemonMove[]): string | undefined {
  const groups = versionGroupsOf(moves)
  return groups.find((group) => learnsetEntries(moves, group, 'level-up').length > 0) ?? groups[0]
}

/** How a version group teaches, with the size of each group for its tab. */
export function learnMethodsOf(
  moves: readonly PokemonMove[],
  versionGroup: string,
): LearnMethodCount[] {
  const counts = new Map<string, number>()
  for (const entry of moves) {
    for (const detail of entry.version_group_details) {
      if (detail.version_group.name !== versionGroup) continue
      const method = detail.move_learn_method.name
      counts.set(method, (counts.get(method) ?? 0) + 1)
    }
  }

  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => rankOf(a.name) - rankOf(b.name) || a.name.localeCompare(b.name))
}

function rankOf(method: string): number {
  const index = METHODS.indexOf(method)
  return index === -1 ? METHODS.length : index
}

/** The links one tab has to resolve, in the order the table lists them. */
export function learnsetEntries(
  moves: readonly PokemonMove[],
  versionGroup: string,
  method: string,
): LearnsetEntry[] {
  const entries: LearnsetEntry[] = []
  for (const entry of moves) {
    for (const detail of entry.version_group_details) {
      if (detail.version_group.name !== versionGroup) continue
      if (detail.move_learn_method.name !== method) continue
      entries.push({ link: entry.move, level: detail.level_learned_at })
    }
  }
  return entries.sort((a, b) => a.level - b.level || a.link.name.localeCompare(b.link.name))
}
