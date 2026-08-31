import type { GenerationName, Pokemon, PokemonType } from 'pokenode-ts'
import { generationOrder } from '@/lib/generation'

/**
 * The types a Pokémon had in `generation`, or the ones it has now.
 *
 * Each `past_types` entry records the *last* generation its typing applied to —
 * the same convention `relationsFor` reads `past_damage_relations` by — so the
 * typing in force is the first entry still at or after the generation asked
 * for. Magnemite's `generation-i` entry is what it was through Gen I; Steel
 * arrives with the current list at Gen II.
 *
 * A matchup chart scoped to a generation is only honest if the defender is
 * scoped too: Magnemite read with today's typing is weak to Ground ×4 in a Gen I
 * chart, which is a confidently wrong answer.
 */
export function typesIn(pokemon: Pokemon, generation?: GenerationName): PokemonType[] {
  if (!generation) return pokemon.types

  const asked = generationOrder(generation)
  const past = [...pokemon.past_types].sort(
    (a, b) => generationOrder(a.generation.name) - generationOrder(b.generation.name),
  )

  return past.find((entry) => generationOrder(entry.generation.name) >= asked)?.types ?? pokemon.types
}
