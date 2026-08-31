import { resourceId, type ItemCategory } from 'pokenode-ts'
import type { ItemEntry } from '@/api/queries/items'

export interface ItemRow extends ItemEntry {
  /** Absent until the category query lands; the row renders without them. */
  category?: string
  pocket?: string
}

/**
 * The list index, with the category and pocket each item belongs to.
 *
 * Read backwards off the categories, which name both the items in them and the
 * pocket they sit in — the alternative is resolving all two thousand items to
 * fill the same two columns.
 */
export function indexItems(
  entries: readonly ItemEntry[],
  categories: readonly ItemCategory[] | undefined,
): ItemRow[] {
  const categoryOf = new Map<number, string>()
  const pocketOf = new Map<number, string>()
  for (const category of categories ?? []) {
    for (const link of category.items) {
      const id = resourceId(link)
      categoryOf.set(id, category.name)
      pocketOf.set(id, category.pocket.name)
    }
  }

  return entries.map((entry) => ({
    ...entry,
    category: categoryOf.get(entry.id),
    pocket: pocketOf.get(entry.id),
  }))
}

/**
 * Filters compose by intersection, as the dex's do.
 *
 * A row whose category has not arrived yet is kept rather than dropped, so the
 * list narrows as the reference query resolves instead of blanking and
 * refilling.
 */
export function filterItems(
  rows: readonly ItemRow[],
  query: string,
  pocket: string,
  category: string,
): ItemRow[] {
  const term = query.trim().toLowerCase().replaceAll(' ', '-')

  return rows.filter((row) => {
    if (pocket && row.pocket && row.pocket !== pocket) return false
    if (category && row.category && row.category !== category) return false
    return term === '' || row.name.includes(term)
  })
}

/** The categories of one pocket, for the second picker. Sorted for a stable list. */
export function categoriesIn(
  categories: readonly ItemCategory[] | undefined,
  pocket: string,
): string[] {
  return (categories ?? [])
    .filter((category) => !pocket || category.pocket.name === pocket)
    .map((category) => category.name)
    .sort()
}
