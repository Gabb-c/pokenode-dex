import type { Berry } from 'pokenode-ts'
import { humanize } from '@/lib/format'

/** The strongest flavour on any berry, so the bars share one scale. */
const MAX_POTENCY = 40

/**
 * What a berry tastes of, and how strongly.
 *
 * A flavour with no potency is left out rather than drawn empty: the berry
 * carries all five either way, and a row of zeroes says nothing a reader wants.
 */
export function BerryFlavors({ berry }: { berry: Berry }) {
  const tasted = berry.flavors.filter((entry) => entry.potency > 0)
  if (tasted.length === 0) return null

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Flavours</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {tasted.map((entry) => (
          <li key={entry.flavor.name} className="flex items-center gap-3 text-sm">
            <span className="w-16 shrink-0 text-micro uppercase text-ink-lo">
              {humanize(entry.flavor.name)}
            </span>
            <span
              role="meter"
              aria-label={entry.flavor.name}
              aria-valuenow={entry.potency}
              aria-valuemin={0}
              aria-valuemax={MAX_POTENCY}
              className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
            >
              <span
                className="block h-full rounded-full bg-[var(--t)]"
                style={{ width: `${Math.min(100, (entry.potency / MAX_POTENCY) * 100)}%` }}
              />
            </span>
            <output className="w-8 text-right text-ink-hi" data-numeric>
              {entry.potency}
            </output>
          </li>
        ))}
      </ul>
    </section>
  )
}
