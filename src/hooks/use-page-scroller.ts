import { useLayoutEffect, useState } from 'react'

/**
 * The page scroller a virtual list sits in, and how far down it starts.
 *
 * `main` is the app's only scroll container (see `__root.tsx`), so a list
 * virtualizes against it rather than against a scroller of its own. A second one
 * leaves a phone swiping whatever height the filters did not take — around a row
 * and a half — while the page behind it cannot move at all.
 *
 * `scrollMargin` is the distance from the top of that container's content down
 * to the list, which is whatever sits above it at the current width.
 */
export function usePageScroller(element: HTMLElement | null): {
  scroller: HTMLElement | null
  scrollMargin: number
} {
  const [scrollMargin, setScrollMargin] = useState(0)
  const scroller = element?.closest('main') ?? null

  useLayoutEffect(() => {
    if (!element || !scroller) return

    const measure = () =>
      // oxlint-disable-next-line react/set-state-in-effect -- a measurement has no render-phase equivalent
      setScrollMargin(
        element.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop,
      )

    measure()
    // The scroller, because its width is what rewraps the filters above the
    // list; the list, because it is remeasured whenever it is rebuilt.
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [element, scroller])

  return { scroller, scrollMargin }
}
