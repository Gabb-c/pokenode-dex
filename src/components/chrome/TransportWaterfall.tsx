import type { TransportEvent } from '@/api/transport-log'
import { SOURCE_TONE, endpoint, ms } from '@/lib/transport/describe'
import { waterfallRows, type Outcome, type WaterfallRow } from '@/lib/transport/waterfall'

/** As many rows as a drawer can show without becoming a page of its own. */
const ROWS = 12

/** The bar is a share of the slowest request on screen, not of a fixed ceiling. */
const MIN_BAR = 2

const TONE: Record<Outcome, string> = {
  ...SOURCE_TONE,
  pending: 'text-ink-lo',
  cancelled: 'text-ink-lo',
  error: 'text-negative',
}

const LABEL: Record<Outcome, string> = {
  network: 'network',
  cache: 'L2 hit',
  'in-flight': 'coalesced',
  revalidated: '304',
  pending: 'pending',
  cancelled: 'cancelled',
  error: 'error',
}

/**
 * The last dozen requests, laid out against each other.
 *
 * The rail's own line answers "what just happened"; this answers "what has this
 * page been doing" — which tier served each request and what it cost. Both read
 * the same 200-entry ring buffer the transport's logger fills.
 */
export function TransportWaterfall({ events }: { events: readonly TransportEvent[] }) {
  const rows = waterfallRows(events, ROWS)
  if (rows.length === 0) {
    return <p className="px-4 py-3 text-micro text-ink-lo">Nothing has been requested yet.</p>
  }

  const slowest = rows.reduce((longest, row) => Math.max(longest, row.durationMs ?? 0), 1)

  return (
    <ul className="max-h-[min(16rem,40dvh)] overflow-y-auto overscroll-contain px-4 py-2">
      {rows.map((row) => (
        <Row key={row.id} row={row} slowest={slowest} />
      ))}
    </ul>
  )
}

function Row({ row, slowest }: { row: WaterfallRow; slowest: number }) {
  const width = row.durationMs === undefined ? 100 : (row.durationMs / slowest) * 100

  return (
    <li className="flex items-center gap-3 py-0.5 text-micro">
      <span className={`w-20 shrink-0 ${TONE[row.outcome]}`}>{LABEL[row.outcome]}</span>
      <span className="w-40 shrink-0 truncate font-mono text-ink-mid" title={row.url}>
        {endpoint(row.url)}
      </span>
      {/* The bar is decoration over a figure that is already written out. */}
      <span aria-hidden className="hidden h-1 flex-1 rounded-full bg-surface-2 sm:block">
        <span
          className={`block h-full rounded-full ${
            row.outcome === 'pending' ? 'bg-ink-lo opacity-40' : 'bg-accent'
          }`}
          style={{ width: `${Math.max(MIN_BAR, width)}%` }}
        />
      </span>
      <span className="w-16 shrink-0 text-right text-ink-lo" data-numeric>
        {row.durationMs === undefined ? '…' : ms(row.durationMs)}
      </span>
    </li>
  )
}
