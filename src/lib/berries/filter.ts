import { resourceId, type BerryFirmness, type BerryFlavor } from 'pokenode-ts'
import type { BerryEntry } from '@/api/queries/berries'

export type FlavorName = BerryFlavor['name']

export interface BerryRow extends BerryEntry {
  /** Absent until the reference queries land; the row renders without them. */
  flavors?: Partial<Record<FlavorName, number>>
  /** The flavour with the highest potency, which is what a berry is known for. */
  dominant?: FlavorName
  firmness?: string
}

/**
 * The list index, with the flavours and firmness each berry carries.
 *
 * Read backwards off the five flavours and five firmnesses, which name the
 * berries that belong to them — the alternative is resolving every berry in the
 * list to fill the same two columns.
 */
export function indexBerries(
  entries: readonly BerryEntry[],
  flavors: readonly BerryFlavor[] | undefined,
  firmnesses: readonly BerryFirmness[] | undefined,
): BerryRow[] {
  const potencies = new Map<number, Partial<Record<FlavorName, number>>>()
  for (const flavor of flavors ?? []) {
    for (const { berry, potency } of flavor.berries) {
      if (potency === 0) continue
      const id = resourceId(berry)
      const held = potencies.get(id) ?? {}
      held[flavor.name] = potency
      potencies.set(id, held)
    }
  }

  const firmnessOf = new Map<number, string>()
  for (const firmness of firmnesses ?? []) {
    for (const link of firmness.berries) firmnessOf.set(resourceId(link), firmness.name)
  }

  return entries.map((entry) => {
    const flavorMap = potencies.get(entry.id)
    return {
      ...entry,
      flavors: flavorMap,
      dominant: flavorMap && strongest(flavorMap),
      firmness: firmnessOf.get(entry.id),
    }
  })
}

/** Ties go to the first flavour the API listed, which is the canonical order. */
function strongest(flavors: Partial<Record<FlavorName, number>>): FlavorName | undefined {
  let best: FlavorName | undefined
  for (const [name, potency] of Object.entries(flavors) as [FlavorName, number][]) {
    if (best === undefined || potency > (flavors[best] ?? 0)) best = name
  }
  return best
}

/**
 * Filters compose by intersection, as the dex's do.
 *
 * A row whose flavour or firmness has not arrived yet is kept rather than
 * dropped, so the list narrows as the reference queries resolve instead of
 * blanking and refilling.
 */
export function filterBerries(
  rows: readonly BerryRow[],
  query: string,
  flavor: string,
  firmness: string,
): BerryRow[] {
  const term = query.trim().toLowerCase().replaceAll(' ', '-')

  return rows.filter((row) => {
    if (flavor && row.flavors && !(flavor in row.flavors)) return false
    if (firmness && row.firmness && row.firmness !== firmness) return false
    return term === '' || row.name.includes(term)
  })
}
