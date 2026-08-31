import { Link } from '@tanstack/react-router'
import type { Move } from 'pokenode-ts'
import { humanize } from '@/lib/format'

/** Enough to browse; the dex filter is the right tool past this. */
const LISTED = 60

export function LearnedBy({ move }: { move: Move }) {
  if (move.learned_by_pokemon.length === 0) return null

  return (
    <section>
      <h2 className="text-micro uppercase text-ink-lo">
        Learned by <output data-numeric>{move.learned_by_pokemon.length}</output>
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {move.learned_by_pokemon.slice(0, LISTED).map((pokemon) => (
          <li key={pokemon.name}>
            <Link
              to="/pokemon/$name"
              params={{ name: pokemon.name }}
              className="well block px-2.5 py-1 text-sm text-ink-hi hover:text-accent"
            >
              {humanize(pokemon.name)}
            </Link>
          </li>
        ))}
      </ul>
      {move.learned_by_pokemon.length > LISTED && (
        <p className="mt-3 text-sm text-ink-lo">
          The first <output data-numeric>{LISTED}</output> of{' '}
          <output data-numeric>{move.learned_by_pokemon.length}</output>.
        </p>
      )}
    </section>
  )
}
