import { useCallback, useSyncExternalStore } from 'react'
import { record } from '@/lib/storage'

/** Six is the party the games allow, and the number the coverage grid reads against. */
export const TEAM_SIZE = 6

/** Pokémon slugs, in the order they were added. */
export type Team = readonly string[]

function isTeam(raw: unknown): raw is string[] {
  return Array.isArray(raw) && raw.every((entry) => typeof entry === 'string')
}

const saved = record('team', isTeam)

const listeners = new Set<() => void>()

const EMPTY: Team = []

/**
 * The saved team, outside React.
 *
 * A `useSyncExternalStore` snapshot has to keep a stable identity between
 * commits, which an array read back out of `localStorage` on every render would
 * not — so the parsed value is held here and only replaced when it changes.
 */
let team: Team = saved.read([])

function publish(next: Team) {
  team = next
  saved.save([...next])
  for (const listener of listeners) listener()
}

export function useTeam(): {
  team: Team
  add: (name: string) => void
  remove: (name: string) => void
  clear: () => void
} {
  const subscribe = useCallback((listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, [])

  const value = useSyncExternalStore(
    subscribe,
    () => team,
    // No storage on the server, and an empty team is the honest answer there.
    () => EMPTY,
  )

  return {
    team: value,
    add(name: string) {
      if (team.includes(name) || team.length >= TEAM_SIZE) return
      publish([...team, name])
    },
    remove(name: string) {
      publish(team.filter((entry) => entry !== name))
    },
    clear() {
      publish([])
    },
  }
}
