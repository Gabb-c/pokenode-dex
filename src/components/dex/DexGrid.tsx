import { useLayoutEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { DexEntry } from '@/api/queries/search-index'
import { PokemonCard } from '@/components/dex/PokemonCard'
import { usePageScroller } from '@/hooks/use-page-scroller'

const CARD_MIN = 150
const ROW_HEIGHT = 186

/**
 * A virtualized grid of cards.
 *
 * It owns the virtualizer alone: React Compiler refuses to memoize any
 * component holding `useVirtualizer`, so keeping it here leaves the routes that
 * render it compiled. It knows nothing about where its entries came from —
 * the national dex and a regional one are the same grid.
 */
export function DexGrid({
  matches,
  /** What the result set is of. The grid fades when it changes, never on scroll. */
  signature,
}: {
  matches: readonly DexEntry[]
  signature: string
}) {
  // Held as state, not a ref: the empty state unmounts this element, and a ref
  // identity never changes, so an effect keyed on one would not re-attach.
  const [list, setList] = useState<HTMLDivElement | null>(null)
  // The grid scrolls with the page rather than inside itself; `scrollMargin` is
  // what the filters above it are taking.
  const { scroller, scrollMargin } = usePageScroller(list)
  const columns = useColumns(list)

  // oxlint-disable-next-line react/incompatible-library -- the bail-out is contained to this component
  const virtualizer = useVirtualizer({
    count: Math.ceil(matches.length / columns),
    getScrollElement: () => scroller,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
    scrollMargin,
  })

  return (
    <div ref={setList}>
      {/* The fade sits here rather than on the measured element — keying that
          would rebuild the ResizeObservers and the virtualizer on every
          keystroke — and rather than on a row, which mounts and unmounts as it
          scrolls. Opacity only: a transform here would be a containing block
          nobody asked for. */}
      <div
        key={signature}
        className="fade-in relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            // Rows are positioned, so the row gutter has to be padding: a grid
            // `gap` only separates columns here.
            className="absolute inset-x-0 top-0 grid gap-3 pb-3"
            style={{
              height: row.size,
              transform: `translateY(${row.start - scrollMargin}px)`,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {matches.slice(row.index * columns, row.index * columns + columns).map((entry) => (
              <PokemonCard key={entry.id} entry={entry} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Columns follow the grid's own width, so the virtualizer can page by row. */
function useColumns(element: HTMLElement | null): number {
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    if (!element) return
    // Read once up front: waiting for the observer's first callback renders the
    // whole grid at one column, and the virtualizer sizes for every row of it.
    // oxlint-disable-next-line react/set-state-in-effect -- a measurement has no render-phase equivalent
    setWidth(element.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return Math.max(1, Math.floor(width / CARD_MIN))
}
