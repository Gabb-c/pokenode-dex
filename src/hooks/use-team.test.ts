import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { PREFIX } from '@/lib/storage'
import { TEAM_SIZE, useTeam } from './use-team'

/**
 * The store is a module singleton, so each test clears it through the hook
 * rather than reimporting the module.
 */
afterEach(() => {
  const { result } = renderHook(() => useTeam())
  act(() => result.current.clear())
})

const saved = () => localStorage.getItem(`${PREFIX}team`)

describe('useTeam', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useTeam())
    expect(result.current.team).toEqual([])
  })

  it('adds a member and writes it through', () => {
    const { result } = renderHook(() => useTeam())
    act(() => result.current.add('pikachu'))
    expect(result.current.team).toEqual(['pikachu'])
    expect(saved()).toBe('["pikachu"]')
  })

  it('refuses a duplicate', () => {
    const { result } = renderHook(() => useTeam())
    act(() => result.current.add('pikachu'))
    act(() => result.current.add('pikachu'))
    expect(result.current.team).toEqual(['pikachu'])
  })

  it('stops at a full party', () => {
    const { result } = renderHook(() => useTeam())
    for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      act(() => result.current.add(name))
    }
    expect(result.current.team).toHaveLength(TEAM_SIZE)
  })

  it('removes a member without disturbing the rest', () => {
    const { result } = renderHook(() => useTeam())
    for (const name of ['a', 'b', 'c']) act(() => result.current.add(name))
    act(() => result.current.remove('b'))
    expect(result.current.team).toEqual(['a', 'c'])
  })

  it('keeps a stable snapshot identity between reads', () => {
    const { result, rerender } = renderHook(() => useTeam())
    act(() => result.current.add('pikachu'))
    const first = result.current.team
    rerender()
    expect(result.current.team).toBe(first)
  })

  it('prefixes its key like every other saved value', () => {
    const { result } = renderHook(() => useTeam())
    act(() => result.current.add('pikachu'))
    expect(saved()).not.toBeNull()
  })
})
