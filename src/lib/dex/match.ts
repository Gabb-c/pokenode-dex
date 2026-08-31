import type { DexEntry } from '@/api/queries/search-index'

const MAX_RESULTS = 8

/**
 * Ranked matches for a partial name or a bare dex number.
 *
 * A name that starts with the term is a better answer than one that merely
 * contains it, so `mime` offers Mime Jr. before Mr. Mime.
 */
export function matchDex(
  index: readonly DexEntry[],
  query: string,
  limit = MAX_RESULTS,
): DexEntry[] {
  const term = query.trim().toLowerCase()
  if (!term) return index.slice(0, limit)

  const starts: DexEntry[] = []
  const contains: DexEntry[] = []
  for (const entry of index) {
    if (entry.name.startsWith(term)) starts.push(entry)
    else if (entry.name.includes(term) || String(entry.id) === term) contains.push(entry)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}
