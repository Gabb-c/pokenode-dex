/**
 * The sections, in the order the top bar shows them.
 *
 * One registry rather than two: the bar renders it and the command palette
 * matches against it, so a section can never be reachable by shortcut alone.
 */
export const NAV = [
  { to: '/pokemon', label: 'Dex' },
  { to: '/moves', label: 'Moves' },
  { to: '/types', label: 'Types' },
  { to: '/games', label: 'Games' },
  { to: '/berries', label: 'Berries' },
  { to: '/items', label: 'Items' },
  { to: '/locations', label: 'Locations' },
  { to: '/machines', label: 'Machines' },
  { to: '/compare', label: 'Compare' },
  { to: '/team', label: 'Team' },
  { to: '/play', label: 'Play' },
  { to: '/about', label: 'How it works' },
] as const

export type NavItem = (typeof NAV)[number]

/** Sections whose label the term is a prefix of, then ones it merely appears in. */
export function matchNav(query: string, limit = 3): NavItem[] {
  const term = query.trim().toLowerCase()
  if (!term) return []

  const starts: NavItem[] = []
  const contains: NavItem[] = []
  for (const item of NAV) {
    const label = item.label.toLowerCase()
    if (label.startsWith(term)) starts.push(item)
    else if (label.includes(term)) contains.push(item)
  }
  return [...starts, ...contains].slice(0, limit)
}
