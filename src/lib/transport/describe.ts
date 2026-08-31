import type { ResponseSource, TransportEvent } from '@/api/transport-log'

export const SOURCE_LABEL: Record<ResponseSource, string> = {
  network: 'network',
  cache: 'L2 hit',
  'in-flight': 'coalesced',
  revalidated: '304',
}

export const SOURCE_TONE: Record<ResponseSource, string> = {
  network: 'text-caution',
  cache: 'text-positive',
  'in-flight': 'text-accent',
  revalidated: 'text-positive',
}

/** `performance.now()` deltas carry float noise the rail has no room for. */
export const ms = (value: number) => `${Math.round(value)} ms`

export function describe(event: TransportEvent): { tone: string; label: string; detail: string } {
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
export function endpoint(url: string): string {
  try {
    return new URL(url).pathname.replace('/api/v2/', '')
  } catch {
    return url
  }
}
