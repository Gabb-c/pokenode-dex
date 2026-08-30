import type {
  Logger,
  LogCancelledPayload,
  LogErrorPayload,
  LogRequestPayload,
  LogResponsePayload,
  LogRetryPayload,
} from 'pokenode-ts'

/** Where a response came from, as reported by the client's own logger. */
export type ResponseSource = LogResponsePayload['source']

export type TransportEvent =
  | { kind: 'request'; id: number; at: number; url: string; method: string }
  | {
      kind: 'response'
      id: number
      at: number
      url: string
      status: number
      source: ResponseSource
      durationMs: number
    }
  | { kind: 'retry'; id: number; at: number; url: string; attempt: number; delayMs: number; status?: number }
  | { kind: 'cancelled'; id: number; at: number; url: string; durationMs: number }
  | { kind: 'error'; id: number; at: number; url: string; message: string }

/**
 * The event feed, and the counts the client does not keep.
 *
 * Responses tallied by origin are `stats()` in `client.ts` — the transport
 * counts those itself, and counting them twice is how the two disagree.
 */
export interface TransportSnapshot {
  /** Newest first. */
  events: readonly TransportEvent[]
  /** Requests still outstanding, which is a different question to `ClientStats.inFlight`. */
  inFlight: number
  retries: number
  cancelled: number
  errors: number
}

/** `Omit` over a union keeps only the shared keys; this maps over the members instead. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** A transport event before the store stamps it with an id and a timestamp. */
type NewEvent = DistributiveOmit<TransportEvent, 'id' | 'at'>

const CAPACITY = 200

const emptySnapshot: TransportSnapshot = {
  events: [],
  inFlight: 0,
  retries: 0,
  cancelled: 0,
  errors: 0,
}

let snapshot: TransportSnapshot = emptySnapshot
let nextId = 0
const listeners = new Set<() => void>()

function commit(next: TransportSnapshot) {
  snapshot = next
  for (const listener of listeners) listener()
}

function push(event: NewEvent) {
  const full = { ...event, id: nextId++, at: Date.now() } as TransportEvent
  const events = [full, ...snapshot.events].slice(0, CAPACITY)

  const next: TransportSnapshot = { ...snapshot, events }
  switch (full.kind) {
    case 'request':
      next.inFlight = snapshot.inFlight + 1
      break
    case 'response':
      next.inFlight = Math.max(0, snapshot.inFlight - 1)
      break
    case 'cancelled':
      next.inFlight = Math.max(0, snapshot.inFlight - 1)
      next.cancelled = snapshot.cancelled + 1
      break
    case 'retry':
      next.retries = snapshot.retries + 1
      break
    case 'error':
      next.inFlight = Math.max(0, snapshot.inFlight - 1)
      next.errors = snapshot.errors + 1
      break
  }
  commit(next)
}

export const transportLog = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot(): TransportSnapshot {
    return snapshot
  },
  clear() {
    commit(emptySnapshot)
  },
}

function errorMessage(payload: LogErrorPayload): string {
  const err = payload.err ?? payload.error
  return err instanceof Error ? err.message : payload.msg
}

/**
 * Adapts pokenode-ts's request lifecycle into the store the status rail reads.
 *
 * The library reports `source` on every response, which is the only way to tell
 * a cache hit from a 304 from a real round trip — none of that is visible from
 * the outside once the promise resolves.
 */
export const transportLogger: Logger = {
  debug(payload: LogRequestPayload | LogResponsePayload | LogRetryPayload | LogCancelledPayload) {
    switch (payload.event) {
      case 'request':
        push({ kind: 'request', url: payload.url, method: payload.method })
        break
      case 'response':
        push({
          kind: 'response',
          url: payload.url,
          status: payload.status,
          source: payload.source,
          durationMs: payload.durationMs,
        })
        break
      case 'retry':
        push({
          kind: 'retry',
          url: payload.url,
          attempt: payload.attempt,
          delayMs: payload.delayMs,
          status: payload.status,
        })
        break
      case 'cancelled':
        push({ kind: 'cancelled', url: payload.url, durationMs: payload.durationMs })
        break
    }
  },
  error(payload: LogErrorPayload) {
    push({ kind: 'error', url: payload.url, message: errorMessage(payload) })
  },
}
