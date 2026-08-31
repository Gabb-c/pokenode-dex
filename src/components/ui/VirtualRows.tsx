import { Fragment, useState, type CSSProperties, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { usePageScroller } from '@/hooks/use-page-scroller'

interface VirtualRowsProps<T> {
  items: readonly T[]
  /** What the result set is of. The list fades when it changes, never on scroll. */
  signature: string
  rowHeight: number
  keyOf: (item: T) => string | number
  /** The row applies the style itself, so the whole row stays one link. */
  children: (item: T, style: CSSProperties) => ReactNode
}

/**
 * A list too long to put in the DOM, rendered a screen at a time.
 *
 * Owns the virtualizer alone, for the reason the dex grid documents: the React
 * Compiler bails out of any component holding one, so keeping it here leaves
 * the routes above it compiled.
 */
export function VirtualRows<T>({
  items,
  signature,
  rowHeight,
  keyOf,
  children,
}: VirtualRowsProps<T>) {
  const [list, setList] = useState<HTMLDivElement | null>(null)
  // The list scrolls with the page rather than inside itself; `scrollMargin` is
  // what the header above it is taking.
  const { scroller, scrollMargin } = usePageScroller(list)

  // oxlint-disable-next-line react/incompatible-library -- the bail-out is contained to this component
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scroller,
    estimateSize: () => rowHeight,
    overscan: 8,
    scrollMargin,
  })

  return (
    // `overflow-hidden` only for the corners: the rows are positioned, and the
    // panel's radius has nothing to clip them with otherwise.
    <div ref={setList} className="panel overflow-hidden">
      {/* Container, not row: rows mount and unmount as they scroll. */}
      <div
        key={signature}
        className="fade-in relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <Fragment key={keyOf(items[item.index])}>
            {children(items[item.index], {
              height: item.size,
              transform: `translateY(${item.start - scrollMargin}px)`,
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
