const KEY = 'pokenode-dex:battle-wins'

/**
 * Its own key, deliberately.
 *
 * `pokenode-dex:best-streak` is named for no mode in particular and is already
 * read by the hub and the silhouette game, so sharing it would have one mode
 * overwrite the other's record.
 *
 * `localStorage` is absent under test and throws outright in some privacy modes.
 */
export function readBattleWins(): number {
  try {
    const saved = Number(localStorage.getItem(KEY))
    return Number.isInteger(saved) && saved > 0 ? saved : 0
  } catch {
    return 0
  }
}

export function saveBattleWins(wins: number): void {
  try {
    localStorage.setItem(KEY, String(wins))
  } catch {
    // A rejected write only costs the next session its record.
  }
}
