import { beforeEach, describe, expect, it } from 'vitest'
import { transportLog, transportLogger } from './transport-log'

const request = (url: string) =>
  transportLogger.debug({ event: 'request', method: 'GET', url, msg: '', message: '' })

const response = (url: string, source: 'network' | 'cache' | 'in-flight' | 'revalidated') =>
  transportLogger.debug({
    event: 'response',
    status: source === 'revalidated' ? 304 : 200,
    source,
    durationMs: 12,
    url,
    msg: '',
    message: '',
  })

describe('transportLog', () => {
  beforeEach(() => transportLog.clear())

  it('tracks in-flight requests down as well as up', () => {
    request('a')
    request('b')
    expect(transportLog.getSnapshot().inFlight).toBe(2)

    response('a', 'network')
    expect(transportLog.getSnapshot().inFlight).toBe(1)
  })

  it('settles an in-flight request on cancellation and on error', () => {
    request('a')
    transportLogger.debug({ event: 'cancelled', reason: 'x', durationMs: 3, url: 'a', msg: '', message: '' })
    expect(transportLog.getSnapshot().inFlight).toBe(0)

    request('b')
    transportLogger.error({ event: 'error', err: new Error('boom'), error: null, url: 'b', msg: '', message: '' })
    const snapshot = transportLog.getSnapshot()
    expect(snapshot.inFlight).toBe(0)
    expect(snapshot.errors).toBe(1)
  })

  it('never reports a negative in-flight count', () => {
    response('orphan', 'cache')
    expect(transportLog.getSnapshot().inFlight).toBe(0)
  })

  it('hands out a new snapshot per change, so useSyncExternalStore re-renders', () => {
    const before = transportLog.getSnapshot()
    request('a')
    expect(transportLog.getSnapshot()).not.toBe(before)
  })

  it('keeps the newest event first', () => {
    request('first')
    request('second')
    expect(transportLog.getSnapshot().events[0]?.url).toBe('second')
  })
})
