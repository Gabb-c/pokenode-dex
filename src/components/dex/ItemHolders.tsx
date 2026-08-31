import { Link } from '@tanstack/react-router'
import { getPokemonSpriteUrl, resourceId, type Item } from 'pokenode-ts'
import { humanize } from '@/lib/format'

/** The rarest a hold gets before it stops being worth reporting as a chance. */
function rarest(details: readonly { rarity: number }[]): number {
  return details.reduce((highest, detail) => Math.max(highest, detail.rarity), 0)
}

/**
 * Who is found holding this, and how often.
 *
 * The links are already on the item, so this costs no request — the inverse of
 * the held-items panel on a Pokémon's own page.
 */
export function ItemHolders({ item }: { item: Item }) {
  if (item.held_by_pokemon.length === 0) return null

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Held by</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {item.held_by_pokemon.map((holder) => (
          <li key={holder.pokemon.name} className="flex items-center justify-between gap-4">
            <Link
              to="/pokemon/$name"
              params={{ name: holder.pokemon.name }}
              search={{}}
              className="flex items-center gap-2 text-sm text-accent hover:underline"
            >
              {/* Built from the id the link already carries, so the row costs
                  no request. Decorative: the name beside it is the label. */}
              <img
                src={getPokemonSpriteUrl(resourceId(holder.pokemon))}
                alt=""
                width={32}
                height={32}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="size-8 shrink-0 object-contain [image-rendering:pixelated]"
              />
              {humanize(holder.pokemon.name)}
            </Link>
            <span className="text-micro uppercase text-ink-lo">
              <output data-numeric>{rarest(holder.version_details)}</output>%
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
