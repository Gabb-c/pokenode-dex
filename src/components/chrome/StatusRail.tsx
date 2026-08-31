import { useState, useSyncExternalStore } from 'react'
import { stats } from '@/api/client'
import { clearAllCaches, l1Hits } from '@/api/query-client'
import { transportLog } from '@/api/transport-log'
import { TransportWaterfall } from '@/components/chrome/TransportWaterfall'
import { useRailOpen } from '@/hooks/use-rail-open'
import { describe, endpoint } from '@/lib/transport/describe'

export function StatusRail() {
  const [open, setOpen] = useRailOpen()
  // Not persisted: the drawer is a thing you open to look at something, not a
  // layout preference, and it reads a log that starts empty on every reload.
  const [waterfall, setWaterfall] = useState(false)
  // All three stay subscribed while the rail is folded: they tally work that
  // happens either way, and dropping them would only reopen onto stale figures.
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
    <footer className="relative z-20 border-t border-line bg-surface-1/95 backdrop-blur">
      {/* Above the row rather than below it: the rail is the last thing on the
          page, and a drawer opening downwards would open off the screen. */}
      {open && waterfall && (
        <div className="mx-auto max-w-[1400px] border-b border-line">
          <TransportWaterfall events={snapshot.events} />
        </div>
      )}

      {/* Rides the top border while requests are outstanding — the same count
          the pending tally reports, in the shape of the wait. */}
      {snapshot.inFlight > 0 && <span aria-hidden className="rail-sweep" />}

      {/*
       * One row on a phone, swiped rather than wrapped.
       *
       * Wrapping put the rail at three rows and ~76px of a 667px screen. None of
       * the tallies can be dropped — they answer three different questions — so
       * the row scrolls instead, and `overscroll-x-contain` keeps that swipe off
       * the page behind it.
       */}
      <div className="mx-auto flex max-w-[1400px] items-center gap-x-5 overflow-x-auto overscroll-x-contain px-4 py-1.5 text-micro sm:flex-wrap sm:gap-y-1 sm:overflow-x-visible">
        <span className="shrink-0 text-ink-lo uppercase">transport</span>

        {!open ? null : latest && current ? (
          // Keyed on the event, so a tier change arrives rather than replaces.
          <span
            key={`${latest.kind}:${latest.url}`}
            // Truncation is for the wrapped rail; the scrolling one shows the
            // whole endpoint and lets the reader swipe to it.
            className="rise-fast flex shrink-0 items-center gap-2 sm:min-w-0 sm:shrink"
          >
            <span className={current.tone}>{current.label}</span>
            <span className="truncate font-mono text-ink-mid" title={latest.url}>
              {endpoint(latest.url)}
            </span>
            <span className="text-ink-lo" data-numeric>
              {current.detail}
            </span>
          </span>
        ) : (
          <span className="shrink-0 text-ink-lo">idle</span>
        )}

        <span className="ml-auto flex shrink-0 items-center gap-4 text-ink-lo">
          {open && (
            <>
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
                aria-expanded={waterfall}
                onClick={() => setWaterfall(!waterfall)}
                className="btn shrink-0 px-2 py-0.5 hover:text-ink-hi"
              >
                {waterfall ? 'hide recent' : 'recent'}
              </button>
              <button
                type="button"
                onClick={() => void clearAllCaches().then(() => location.reload())}
                className="btn shrink-0 px-2 py-0.5 hover:text-ink-hi"
              >
                clear caches
              </button>
            </>
          )}
          <button
            type="button"
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} transport statistics`}
            onClick={() => setOpen(!open)}
            className="btn shrink-0 px-2 py-0.5 hover:text-ink-hi"
          >
            {open ? 'hide' : 'show'}
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
      {/* Keyed on the figure so each increment restarts the pop. */}
      <output key={value} className="pop text-ink-hi">
        {value}
      </output>
    </span>
  )
}
