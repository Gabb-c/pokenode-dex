/**
 * Every keyed `localStorage` access this app makes.
 *
 * Two rules that were previously kept by hand in six places. Every key is
 * prefixed, so the app never collides with anything else served from the same
 * origin. And every access is guarded: storage is absent under test and throws
 * outright in some privacy modes, so a rejected read or write costs persistence
 * and nothing else.
 *
 * The transport's `WebStorageCache` keeps its own entries under the same
 * prefix without going through the helpers below, so `PREFIX` is exported for
 * it rather than repeated there.
 */
export const PREFIX = 'pokenode-dex:'

export function readItem(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

export function writeItem(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value)
  } catch {
    // Persistence only; whatever asked for the write still applies this session.
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // As above.
  }
}

/** Whether storage can be written at all — the transport picks its cache on this. */
export function canPersist(): boolean {
  try {
    const probe = PREFIX + 'probe'
    localStorage.setItem(probe, probe)
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/** A single non-negative tally kept across sessions, like a record or a streak. */
export interface Counter {
  read(): number
  save(value: number): void
}

export function counter(key: string): Counter {
  return {
    read(): number {
      const saved = Number(readItem(key))
      return Number.isInteger(saved) && saved > 0 ? saved : 0
    },
    save(value: number): void {
      writeItem(key, String(value))
    },
  }
}
