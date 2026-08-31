import { describe, expect, it } from 'vitest'
import type { Pokedex, PokemonEntry } from 'pokenode-ts'
import type { DexEntry } from '@/api/queries/search-index'
import { entriesOf } from './pokedex'

const species = (id: number, name: string): PokemonEntry['pokemon_species'] => ({
  name,
  url: `https://pokeapi.co/api/v2/pokemon-species/${id}/`,
})

const dex = (entries: PokemonEntry[]) => ({ name: 'kanto', pokemon_entries: entries }) as Pokedex

const INDEX: DexEntry[] = [
  { id: 25, name: 'pikachu', no: '0025' },
  { id: 386, name: 'deoxys-normal', no: '0386' },
]

describe('entriesOf', () => {
  it('numbers an entry by the dex, not by the national id', () => {
    const [entry] = entriesOf(dex([{ entry_number: 25, pokemon_species: species(25, 'pikachu') }]), INDEX)

    expect(entry).toEqual({ id: 25, name: 'pikachu', no: '0025' })
  })

  it('orders by entry number, whatever order the payload arrived in', () => {
    const entries = entriesOf(
      dex([
        { entry_number: 2, pokemon_species: species(386, 'deoxys') },
        { entry_number: 1, pokemon_species: species(25, 'pikachu') },
      ]),
      INDEX,
    )

    expect(entries.map((entry) => entry.no)).toEqual(['0001', '0002'])
  })

  it('links the Pokémon the species resolves to, not the species slug', () => {
    const [entry] = entriesOf(dex([{ entry_number: 1, pokemon_species: species(386, 'deoxys') }]), INDEX)

    expect(entry.name).toBe('deoxys-normal')
  })

  it('keeps an entry the index has no id for', () => {
    const [entry] = entriesOf(dex([{ entry_number: 1, pokemon_species: species(9999, 'missingno') }]), INDEX)

    expect(entry).toEqual({ id: 9999, name: 'missingno', no: '0001' })
  })
})
