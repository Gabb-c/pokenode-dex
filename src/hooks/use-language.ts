import { useCallback, useSyncExternalStore } from 'react'
import {
  localize,
  localizeAll,
  type Localized,
  type NamedAPIResource,
  type VersionGroup,
} from 'pokenode-ts'
import { versionGroupOrder } from '@/lib/moves/learnset'
import { readItem, writeItem } from '@/lib/storage'

const KEY = 'language'
const FALLBACK = 'en'

const listeners = new Set<() => void>()

let language = readItem(KEY) ?? FALLBACK

function setLanguage(next: string) {
  language = next
  writeItem(KEY, next)
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

/** Flavour text is published once per version group, and they read differently. */
type VersionedEntry = Localized & { version_group: NamedAPIResource<VersionGroup> }

/**
 * The newest flavour text in the reader's language.
 *
 * `localize` picks one entry and stops; a resource carries dozens, one per game
 * that ever described it, so the question here is *which* of the translated
 * ones — and that needs them all. `localizeAll` narrows to the language,
 * release order picks the survivor, and English stands in for a language a
 * resource was never translated into.
 */
export function useLatestFlavor<T extends VersionedEntry>(entries: readonly T[]): T | undefined {
  const [language] = useLanguage()
  const translated = localizeAll(entries, language)
  const available = translated.length > 0 ? translated : localizeAll(entries, FALLBACK)

  return available.reduce<T | undefined>(
    (latest, entry) =>
      !latest ||
      versionGroupOrder(entry.version_group.name) > versionGroupOrder(latest.version_group.name)
        ? entry
        : latest,
    undefined,
  )
}
