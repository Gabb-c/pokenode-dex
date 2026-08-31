import { counter } from './storage'

/**
 * What the two games remember between sessions.
 *
 * Separate keys, deliberately. `best-streak` is named for no mode in
 * particular and is already read by the hub and the silhouette game, so
 * sharing one key would have each mode overwrite the other's record.
 */
export const bestStreak = counter('best-streak')
export const battleWins = counter('battle-wins')
