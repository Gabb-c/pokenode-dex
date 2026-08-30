import type { DexEntry } from '@/api/queries/search-index'

/**
 * Filters compose by intersection: an entry has to satisfy every active filter.
 *
 * A membership set that has not arrived yet is skipped rather than treated as
 * empty, so the grid narrows as each filter resolves instead of blanking and
 * refilling.
 */
export function filterDex(
  index: readonly DexEntry[],
  query: string,
  generation: ReadonlySet<number> | undefined,
  types: readonly (ReadonlySet<number> | undefined)[],
): DexEntry[] {
  const term = query.trim().toLowerCase()

  return index.filter((entry) => {
    if (generation && !generation.has(entry.id)) return false
    for (const members of types) {
      if (members && !members.has(entry.id)) return false
    }
    if (!term) return true
    return entry.name.includes(term) || entry.no.includes(term)
  })
}
