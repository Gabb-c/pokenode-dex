import { useState } from 'react'
import { useRouterState } from '@tanstack/react-router'

/**
 * The class a page arrives under.
 *
 * Alternates between two rules running identical keyframes rather than keying
 * the container: a `key` would remount the route subtree on every navigation,
 * and `SpriteViewer` deliberately outlives a change of `id` — it holds the URL
 * that failed rather than a flag for exactly that reason. Swapping
 * `animation-name` replays the entrance with the tree intact.
 *
 * Watches the pathname alone, so changing a filter — which lives in the search
 * params — refines the page in place instead of playing an entrance over it.
 */
export function useRouteEnter(): 'rise-a' | 'rise-b' {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [entered, setEntered] = useState({ pathname, flipped: false })

  // Adjusting state during render, not in an effect: the new class has to be
  // on the element in the same commit the path changes in, or the entrance
  // plays a frame late.
  if (entered.pathname !== pathname) {
    setEntered({ pathname, flipped: !entered.flipped })
  }

  return entered.flipped ? 'rise-a' : 'rise-b'
}
