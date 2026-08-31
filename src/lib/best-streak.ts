const KEY = 'pokenode-dex:best-streak'

/** `localStorage` is absent under test and throws outright in some privacy modes. */
export function readBestStreak(): number {
  try {
    const saved = Number(localStorage.getItem(KEY))
    return Number.isInteger(saved) && saved > 0 ? saved : 0
  } catch {
    return 0
  }
}

export function saveBestStreak(streak: number): void {
  try {
    localStorage.setItem(KEY, String(streak))
  } catch {
    // A rejected write only costs the next session its record.
  }
}
