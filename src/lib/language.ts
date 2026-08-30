import { useCallback, useSyncExternalStore } from 'react'
import { localize, type Localized } from 'pokenode-ts'

const KEY = 'pokenode-dex:language'
const FALLBACK = 'en'

const listeners = new Set<() => void>()

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? FALLBACK
  } catch {
    return FALLBACK
  }
}

let language = read()

function setLanguage(next: string) {
  language = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // Persistence is a convenience; the choice still applies for this session.
  }
  for (const listener of listeners) listener()
}

export function useLanguage(): [string, (next: string) => void] {
  const subscribe = useCallback((listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, [])

  const value = useSyncExternalStore(subscribe, () => language, () => FALLBACK)
  return [value, setLanguage]
}

/**
 * The entry in `language`, falling back to English.
 *
 * `localize` returns nothing when a language is absent and deliberately guesses
 * nothing in its place — most sections are translated unevenly, so choosing the
 * fallback is the caller's job.
 */
export function useLocalized<T extends Localized>(entries: readonly T[]): T | undefined {
  const [language] = useLanguage()
  return localize(entries, language) ?? localize(entries, FALLBACK) ?? entries[0]
}
