import { useSuspenseQuery } from '@tanstack/react-query'
import type { Item, Pokemon, PokemonHeldItem } from 'pokenode-ts'
import { heldItemsQuery } from '@/api/queries/items'
import { humanize } from '@/lib/format'
import { useLocalized } from '@/hooks/use-language'

/**
 * What a wild one is found holding, and how often.
 *
 * Mount it only when the Pokémon carries any: most hold nothing, and an empty
 * panel is worse than none.
 */
export function HeldItems({ pokemon }: { pokemon: Pokemon }) {
  const { data: items } = useSuspenseQuery(heldItemsQuery(pokemon))

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Held items</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((item, index) => (
          <HeldItem key={item.id} item={item} rarity={rarityOf(pokemon.held_items[index])} />
        ))}
      </ul>
    </section>
  )
}

/** The games disagree on how often; the best odds are the useful answer. */
function rarityOf(held: PokemonHeldItem | undefined): number {
  return Math.max(0, ...(held?.version_details.map((detail) => detail.rarity) ?? []))
}

function HeldItem({ item, rarity }: { item: Item; rarity: number }) {
  const name = useLocalized(item.names)?.name ?? humanize(item.name)
  const effect = useLocalized(item.effect_entries)?.short_effect

  return (
    <li className="flex items-start gap-3">
      {item.sprites.default && (
        <img src={item.sprites.default} alt="" width={32} height={32} className="shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-sm text-ink-hi">
          {name}
          <span className="ml-2 text-micro text-ink-lo" data-numeric>
            {rarity}%
          </span>
        </p>
        {effect && <p className="text-sm text-ink-mid">{effect}</p>}
      </div>
    </li>
  )
}
