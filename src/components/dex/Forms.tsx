import { Link } from '@tanstack/react-router'
import type { PokemonSpecies } from 'pokenode-ts'
import { humanize } from '@/lib/format'

/**
 * The other Pokémon this species is published as.
 *
 * Costs nothing: the species already names every variety. It is also the only
 * honest way in to them — a species slug is not a Pokémon slug, so `deoxys` is
 * reachable and `deoxys-attack` is only reachable from here.
 */
export function Forms({ species, current }: { species: PokemonSpecies; current: string }) {
  if (species.varieties.length < 2) return null

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Forms</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {species.varieties.map((variety) => {
          const here = variety.pokemon.name === current
          return (
            <li key={variety.pokemon.name}>
              <Link
                to="/pokemon/$name"
                params={{ name: variety.pokemon.name }}
                search={{}}
                aria-current={here ? 'page' : undefined}
                className={`well block px-2.5 py-1 text-sm transition-colors hover:border-line-strong ${
                  here ? 'border-accent text-ink-hi' : 'text-ink-mid'
                }`}
              >
                {humanize(variety.pokemon.name)}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
