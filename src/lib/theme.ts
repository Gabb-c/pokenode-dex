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

function apply() {
  const dark = choice === 'system' ? prefersDark() : choice === 'dark'
  document.documentElement.classList.toggle('dark', dark)
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
