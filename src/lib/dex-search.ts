import { useEffect, useEffectEvent, useState } from 'react'

const DEBOUNCE_MS = 300

/**
 * The search box types locally; the URL follows behind it.
 *
 * Committing per keystroke means one `history.replaceState` per character, which
 * Safari and Firefox throttle and then reject outright. It also puts a router
 * commit between the key and the caret, since the field would be controlled by
 * the search params it is trying to set.
 */
export function useDexSearch(q: string, commit: (next: string) => void) {
  const [draft, setDraft] = useState(q)
  const [lastQ, setLastQ] = useState(q)
  // Not a dependency, so an inline arrow from the caller does not restart the
  // timer on every render.
  const onCommit = useEffectEvent(commit)

  // The field follows the URL when it moves on its own — back, forward, clear
  // filters. Adjusted during render rather than from an effect, so the stale
  // draft is never painted. Leaving `draft` equal to `q` is also what tells the
  // timer below that this was not an edit.
  if (q !== lastQ) {
    setLastQ(q)
    setDraft(q)
  }

  useEffect(() => {
    if (draft === q) return
    const timer = setTimeout(() => onCommit(draft), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, q])

  return [draft, setDraft] as const
}
