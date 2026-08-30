import { useCallback, useSyncExternalStore } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'

const KEY = 'pokenode-dex:theme'
const listeners = new Set<() => void>()

function read(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

let choice: ThemeChoice = read()

function prefersDark(): boolean {
  return matchMedia('(prefers-color-scheme: dark)').matches
}

/** Mirrors `--dur-base`; the class has to outlive the transition it enables. */
const FADE_MS = 240

let fading: ReturnType<typeof setTimeout> | undefined

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
}

function setTheme(next: ThemeChoice) {
  choice = next
  try {
    if (next === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, next)
  } catch {
    // A rejected write only costs persistence; the class below still applies.
  }
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
