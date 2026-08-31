/**
 * The command palette's second way in.
 *
 * A phone has no ⌘K, so the top bar needs to open the palette itself — and it
 * cannot simply hold the ref: the dialog has to stay a sibling of `main`, out of
 * the route entrance's transform, while the button lives in the bar above it.
 * An event is the seam between the two.
 */
const OPEN_EVENT = 'pokenode-dex:palette'

export function openCommandPalette() {
  dispatchEvent(new Event(OPEN_EVENT))
}

/** Returns the unsubscribe, so an effect can hand it straight back. */
export function onOpenCommandPalette(open: () => void): () => void {
  addEventListener(OPEN_EVENT, open)
  return () => removeEventListener(OPEN_EVENT, open)
}
