import { useCallback, useSyncExternalStore } from 'react'
import { readItem, removeItem, writeItem } from '@/lib/storage'

export type ThemeChoice = 'light' | 'dark' | 'system'

const KEY = 'theme'
const listeners = new Set<() => void>()

function read(): ThemeChoice {
  const saved = readItem(KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

let choice: ThemeChoice = read()

function prefersDark(): boolean {
  return matchMedia('(prefers-color-scheme: dark)').matches
}

/** Mirrors `--dur-base`; the class has to outlive the transition it enables. */
const FADE_MS = 240

let fading: ReturnType<typeof setTimeout> | undefined

/**
 * Tints the browser's own chrome — the address bar on a phone — to the surface
 * the page sits on.
 *
 * Read off the computed token rather than duplicated into the meta tag, so
 * theme.css stays the only place a colour is written down. Exported because the
 * first paint needs it too: `apply` only ever runs on a flip.
 */
export function paintBrowserChrome() {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  const surface = getComputedStyle(document.documentElement).getPropertyValue('--surface-0')
  if (surface) meta.setAttribute('content', surface.trim())
}

/**
 * The palette swap, cross-faded.
 *
 * Only ever runs on a real flip — the inline script in `index.html` sets the
 * class before first paint, so there is no initial application here to guard
 * against. `theming` is held for the length of the transition and then dropped;
 * index.css explains why it is not simply left on.
 */
function apply() {
  const root = document.documentElement
  root.classList.add('theming')
  clearTimeout(fading)
  fading = setTimeout(() => root.classList.remove('theming'), FADE_MS)

  const dark = choice === 'system' ? prefersDark() : choice === 'dark'
  root.classList.toggle('dark', dark)
  paintBrowserChrome()
}

function setTheme(next: ThemeChoice) {
  choice = next
  // Only a real choice is written down, so a cleared storage comes back to
  // following the system.
  if (next === 'system') removeItem(KEY)
  else writeItem(KEY, next)
  apply()
  for (const listener of listeners) listener()
}

export function useTheme(): [ThemeChoice, (next: ThemeChoice) => void] {
  const subscribe = useCallback((listener: () => void) => {
    listeners.add(listener)
    const media = matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => {
      if (choice === 'system') apply()
      listener()
    }
    media.addEventListener('change', onSystemChange)
    return () => {
      listeners.delete(listener)
      media.removeEventListener('change', onSystemChange)
    }
  }, [])

  const value = useSyncExternalStore(subscribe, () => choice, () => 'system' as ThemeChoice)
  return [value, setTheme]
}
