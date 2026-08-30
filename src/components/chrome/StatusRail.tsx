import { useSyncExternalStore } from 'react'
import { stats } from '@/api/client'
import { clearAllCaches, l1Hits } from '@/api/query-client'
import { transportLog, type ResponseSource, type TransportEvent } from '@/api/transport-log'

const SOURCE_LABEL: Record<ResponseSource, string> = {
  network: 'network',
  cache: 'L2 hit',
  'in-flight': 'coalesced',
  revalidated: '304',
}

const SOURCE_TONE: Record<ResponseSource, string> = {
  network: 'text-caution',
  cache: 'text-positive',
  'in-flight': 'text-accent',
  revalidated: 'text-positive',
}

/** `performance.now()` deltas carry float noise the rail has no room for. */
const ms = (value: number) => `${Math.round(value)} ms`

function describe(event: TransportEvent): { tone: string; label: string; detail: string } {
  switch (event.kind) {
    case 'response':
      return {
        tone: SOURCE_TONE[event.source],
        label: SOURCE_LABEL[event.source],
        detail: ms(event.durationMs),
      }
    case 'request':
      return { tone: 'text-ink-lo', label: event.method.toLowerCase(), detail: '…' }
    case 'retry':
      return { tone: 'text-caution', label: `retry ${event.attempt}`, detail: ms(event.delayMs) }
    case 'cancelled':
      return { tone: 'text-ink-lo', label: 'cancelled', detail: ms(event.durationMs) }
    case 'error':
      return { tone: 'text-negative', label: 'error', detail: event.message }
  }
}

/** The path is the readable part of a PokéAPI URL; the origin is always the same. */
function endpoint(url: string): string {
  try {
    return new URL(url).pathname.replace('/api/v2/', '')
  } catch {
    return url
  }
}

export function StatusRail() {
  const snapshot = useSyncExternalStore(
    transportLog.subscribe,
    transportLog.getSnapshot,
    transportLog.getSnapshot,
  )
  // The same store drives both: `stats` is reread on every transport event, so
  // the tally and the event line can never disagree.
  const counts = useSyncExternalStore(transportLog.subscribe, stats, stats)
  // L1 answers without a transport event, so it needs its own signal.
  const l1 = useSyncExternalStore(l1Hits.subscribe, l1Hits.get, l1Hits.get)
  const latest = snapshot.events.find((event) => event.kind !== 'request') ?? snapshot.events[0]
  const current = latest ? describe(latest) : undefined

  return (
    <footer className="z-20 border-t border-line bg-surface-1/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-1 px-4 py-1.5 text-micro">
        <span className="text-ink-lo uppercase">transport</span>

        {latest && current ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className={current.tone}>{current.label}</span>
            <span className="truncate font-mono text-ink-mid" title={latest.url}>
              {endpoint(latest.url)}
            </span>
            <span className="text-ink-lo" data-numeric>
              {current.detail}
            </span>
          </span>
        ) : (
          <span className="text-ink-lo">idle</span>
        )}

        <span className="ml-auto flex items-center gap-4 text-ink-lo">
          <Tally label="pending" value={snapshot.inFlight} />
          <Tally label="L1" value={l1} />
          <Tally label="L2" value={counts.cache} />
          <Tally label="304" value={counts.revalidated} />
          <Tally label="net" value={counts.network} />
          {counts.inFlight > 0 && <Tally label="coalesced" value={counts.inFlight} />}
          {/* Only once retries have made it more than the round trips already shown. */}
          {counts.roundTrips > counts.network + counts.revalidated && (
            <Tally label="attempts" value={counts.roundTrips} />
          )}
          {snapshot.cancelled > 0 && <Tally label="cancelled" value={snapshot.cancelled} />}
          {snapshot.errors > 0 && <Tally label="errors" value={snapshot.errors} />}
          <button
            type="button"
            onClick={() => void clearAllCaches().then(() => location.reload())}
            className="rounded-[3px] border border-line px-2 py-0.5 hover:border-line-strong hover:text-ink-hi"
          >
            clear caches
          </button>
        </span>
      </div>
    </footer>
  )
}

function Tally({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-center gap-1">
      {label}
      <output className="text-ink-hi">{value}</output>
    </span>
  )
}
