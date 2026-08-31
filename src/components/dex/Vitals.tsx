import type { Pokemon, PokemonSpecies } from 'pokenode-ts'
import { generationLabel, humanize, kilograms, metres } from '@/lib/format'

/** The paperwork: the figures that fit on one card and need no second request. */
export function Vitals({ pokemon, species }: { pokemon: Pokemon; species: PokemonSpecies }) {
  // Mono is for figures, so a row says whether its value is one.
  const rows = [
    ['Height', metres(pokemon.height), true],
    ['Weight', kilograms(pokemon.weight), true],
    ['Generation', generationLabel(species.generation.name), false],
    ['Base exp.', pokemon.base_experience ? String(pokemon.base_experience) : '—', true],
    ['Capture rate', String(species.capture_rate), true],
    ['Growth', humanize(species.growth_rate.name), false],
  ] as const

  return (
    <dl className="panel divide-y divide-line">
      {rows.map(([label, value, numeric]) => (
        <div key={label} className="flex items-center justify-between px-4 py-2">
          <dt className="text-micro uppercase text-ink-lo">{label}</dt>
          <dd className="text-sm text-ink-hi" data-numeric={numeric ? '' : undefined}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
