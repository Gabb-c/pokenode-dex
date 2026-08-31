import type { Item } from 'pokenode-ts'
import { humanize } from '@/lib/format'

/**
 * What an item costs, per currency and per game.
 *
 * Not a single figure: the endpoint carries a price per version group and per
 * currency, because the same item is bought in Pokédollars in one game and in
 * watts or BP in another. Flattening that to one number would be picking a game
 * on the reader's behalf.
 */
export function ItemPrices({ item }: { item: Item }) {
  if (item.prices.length === 0) return null

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Prices</h2>
      <div
        tabIndex={0}
        role="region"
        aria-label="Prices"
        className="mt-3 overflow-x-auto overscroll-x-contain"
      >
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="text-micro uppercase text-ink-lo">
              <th scope="col" className="p-2 text-left">
                Games
              </th>
              <th scope="col" className="p-2 text-left">
                Currency
              </th>
              <th scope="col" className="p-2 text-right">
                Buy
              </th>
              <th scope="col" className="p-2 text-right">
                Sell
              </th>
            </tr>
          </thead>
          <tbody>
            {item.prices.map((price) => (
              <tr
                key={`${price.version_group.name}:${price.currency.name}`}
                className="border-t border-line"
              >
                <td className="p-2 text-ink-mid">{humanize(price.version_group.name)}</td>
                <td className="p-2 text-ink-lo">{humanize(price.currency.name)}</td>
                <td className="p-2 text-right text-ink-hi">{price.purchase_price ?? '—'}</td>
                <td className="p-2 text-right text-ink-hi">{price.sell_price ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
