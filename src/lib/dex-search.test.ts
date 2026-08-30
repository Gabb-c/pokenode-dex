import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useDexSearch } from './dex-search'

/**
 * The debounce exists to keep `history.replaceState` off the keystroke path —
 * browsers throttle it, and past the limit they throw. These assert the commit
 * count, not the timing.
 */

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const settle = () => act(() => void vi.advanceTimersByTime(300))

describe('useDexSearch', () => {
  it('starts from the query already in the URL', () => {
    const { result } = renderHook(() => useDexSearch('eevee', vi.fn()))
    expect(result.current[0]).toBe('eevee')
  })

  it('commits a burst of keystrokes once', () => {
    const commit = vi.fn()
    const { result } = renderHook(() => useDexSearch('', commit))

    for (const draft of ['p', 'pi', 'pik', 'pika']) {
      act(() => result.current[1](draft))
    }
    expect(commit).not.toHaveBeenCalled()

    settle()
    expect(commit).toHaveBeenCalledExactlyOnceWith('pika')
  })

  it('shows the keystroke immediately, well before it commits', () => {
    const commit = vi.fn()
    const { result } = renderHook(() => useDexSearch('', commit))

    act(() => result.current[1]('pika'))

    expect(result.current[0]).toBe('pika')
    act(() => void vi.advanceTimersByTime(299))
    expect(commit).not.toHaveBeenCalled()
  })

  it('follows the URL when it moves on its own, as back and forward do', () => {
    const commit = vi.fn()
    const { result, rerender } = renderHook(({ q }) => useDexSearch(q, commit), {
      initialProps: { q: 'pika' },
    })

    rerender({ q: 'eevee' })

    expect(result.current[0]).toBe('eevee')
    settle()
    expect(commit).not.toHaveBeenCalled()
  })

  it('does not clobber an edit that is still settling', () => {
    const commit = vi.fn()
    const { result, rerender } = renderHook(({ q }) => useDexSearch(q, commit), {
      initialProps: { q: '' },
    })

    act(() => result.current[1]('char'))
    // A re-render arriving mid-edit — a sibling query resolving, say.
    rerender({ q: '' })

    expect(result.current[0]).toBe('char')
    settle()
    expect(commit).toHaveBeenCalledExactlyOnceWith('char')
  })

  it('stops tracking the URL once the commit lands', () => {
    const commit = vi.fn()
    const { result, rerender } = renderHook(({ q }) => useDexSearch(q, commit), {
      initialProps: { q: '' },
    })

    act(() => result.current[1]('char'))
    settle()
    // The commit reaches the URL, which comes back down as a new `q`.
    rerender({ q: 'char' })

    expect(result.current[0]).toBe('char')
    expect(commit).toHaveBeenCalledTimes(1)
  })
})
