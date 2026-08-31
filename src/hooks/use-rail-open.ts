import { useSyncExternalStore } from 'react'
import { readItem, removeItem, writeItem } from '@/lib/storage'

const KEY = 'rail'
const listeners = new Set<() => void>()

function read(): boolean {
  return readItem(KEY) !== 'hidden'
}

let open = read()

function setOpen(next: boolean) {
  open = next
  if (next) removeItem(KEY)
  else writeItem(KEY, 'hidden')
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
