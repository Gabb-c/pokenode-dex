import type { ReactNode } from 'react'

/**
 * A route's pending state.
 *
 * The copy is the caller's — walking the dex and resolving the type chart are
 * different waits, and saying which one this is costs nothing.
 */
export function Loading({ children }: { children: ReactNode }) {
  return <p className="py-16 text-center text-ink-lo">{children}</p>
}
