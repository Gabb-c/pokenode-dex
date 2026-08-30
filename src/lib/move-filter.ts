import { resourceId, type MoveDamageClass, type Type } from 'pokenode-ts'
import type { MoveEntry } from '@/api/queries/moves'
import { isBattleType, type TypeName } from './types'

export interface MoveRow extends MoveEntry {
  /** Absent until the reference queries land; the row renders without them. */
  type?: TypeName
  damageClass?: string
}

/**
 * The list index, with the type and class each move belongs to.
 *
 * Read backwards off the type and damage-class resources, which carry the moves
 * that belong to them — the alternative is resolving every move in the list.
 */
export function indexMoves(
  entries: readonly MoveEntry[],
  types: readonly Type[] | undefined,
  classes: readonly MoveDamageClass[] | undefined,
): MoveRow[] {
  const typeOf = new Map<number, TypeName>()
  for (const type of types ?? []) {
    if (!isBattleType(type.name)) continue
    for (const link of type.moves) typeOf.set(resourceId(link), type.name)
  }

  const classOf = new Map<number, string>()
  for (const damageClass of classes ?? []) {
    for (const link of damageClass.moves) classOf.set(resourceId(link), damageClass.name)
  }

  return entries.map((entry) => ({
    ...entry,
    type: typeOf.get(entry.id),
    damageClass: classOf.get(entry.id),
  }))
}

/**
 * Filters compose by intersection, as the dex's do.
 *
 * A row whose type or class has not arrived yet is kept rather than dropped, so
 * the list narrows as the reference queries resolve instead of blanking and
 * refilling.
 */
export function filterMoves(
  rows: readonly MoveRow[],
  query: string,
  type: string,
  damageClass: string,
): MoveRow[] {
  const term = query.trim().toLowerCase().replaceAll(' ', '-')

  return rows.filter((row) => {
    if (type && row.type && row.type !== type) return false
    if (damageClass && row.damageClass && row.damageClass !== damageClass) return false
    return term === '' || row.name.includes(term)
  })
}
