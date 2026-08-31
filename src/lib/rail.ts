import { useSyncExternalStore } from 'react'

const KEY = 'pokenode-dex:rail'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'hidden'
  } catch {
    return true
  }
}

let open = read()

function setOpen(next: boolean) {
  open = next
  try {
    if (next) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, 'hidden')
  } catch {
    // A rejected write only costs persistence; the rail still folds.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Whether the rail is showing its figures.
 *
 * Open unless the reader has said otherwise: the transport's behaviour is this
 * app's subject, not decoration. Only the closed state is written down, so a
 * cleared storage comes back open.
 */
export function useRailOpen(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => open,
    () => true,
  )
  return [value, setOpen]
}
