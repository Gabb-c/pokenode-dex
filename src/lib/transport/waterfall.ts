import type { ResponseSource, TransportEvent } from '@/api/transport-log'

/** How a request ended. `pending` is a request the log has no answer for yet. */
export type Outcome = ResponseSource | 'pending' | 'cancelled' | 'error'

export interface WaterfallRow {
  /** The `id` of the event the row is keyed on — the response where there is one. */
  id: number
  url: string
  outcome: Outcome
  /** Absent while pending: the store stamps a duration onto the answer, not the ask. */
  durationMs?: number
  status?: number
  /** When the request went out, so the rows can be laid out against each other. */
  at: number
}

/**
 * The event feed folded into one row per request.
 *
 * The log is a flat stream and an answer carries no reference back to its ask —
 * the `id` is the store's own counter, not the transport's. The URL is the only
 * thing the two share, so pairing is a walk from newest to oldest matching each
 * answer to the first unclaimed request for the same URL. Two requests for one
 * URL are rare (the transport coalesces them) and mispairing them would only
 * swap two identical rows.
 */
export function waterfallRows(
  events: readonly TransportEvent[],
  limit: number,
): WaterfallRow[] {
  const rows: WaterfallRow[] = []
  const answered = new Map<string, WaterfallRow[]>()

  // Newest first, so an answer is always seen before the ask it belongs to.
  for (const event of events) {
    if (event.kind === 'retry') continue

    if (event.kind === 'request') {
      const waiting = answered.get(event.url)
      const row = waiting?.shift()
      if (row) {
        row.at = event.at
        continue
      }
      rows.push({ id: event.id, url: event.url, outcome: 'pending', at: event.at })
      continue
    }

    const row: WaterfallRow = {
      id: event.id,
      url: event.url,
      outcome: event.kind === 'response' ? event.source : event.kind,
      durationMs: event.kind === 'error' ? undefined : event.durationMs,
      status: event.kind === 'response' ? event.status : undefined,
      at: event.at,
    }
    rows.push(row)

    const waiting = answered.get(event.url)
    if (waiting) waiting.push(row)
    else answered.set(event.url, [row])
  }

  return rows.slice(0, limit)
}
