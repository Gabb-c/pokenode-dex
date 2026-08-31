import { resourceId, type Pokedex } from 'pokenode-ts'
import type { DexEntry } from '@/api/queries/search-index'
import { padDexNo } from '@/lib/format'

/**
 * A regional Pokédex as dex entries, in the order the games numbered them.
 *
 * The entries are joined to the search index **by species id**, which is what
 * gets a card a name the Pokémon endpoint answers to: a species called `deoxys`
 * is a Pokémon called `deoxys-normal`, and linking the species slug would 404.
 * A species the index has no id for keeps its own name rather than vanishing.
 *
 * `no` carries the regional number, not the national one, so the filter that
 * searches it answers `007` with the seventh entry of *this* dex.
 */
export function entriesOf(dex: Pokedex, index: readonly DexEntry[]): DexEntry[] {
  const byId = new Map(index.map((entry) => [entry.id, entry]))

  return [...dex.pokemon_entries]
    .sort((a, b) => a.entry_number - b.entry_number)
    .map((entry) => {
      const id = resourceId(entry.pokemon_species)
      return {
        id,
        name: byId.get(id)?.name ?? entry.pokemon_species.name,
        no: padDexNo(entry.entry_number),
      }
    })
}
