import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MoveMenu } from './MoveMenu'
import type { BattleMove } from '@/lib/battle/moveset'

function move(name: string, overrides: Partial<BattleMove> = {}): BattleMove {
  return {
    name,
    type: 'normal',
    power: 60,
    accuracy: 100,
    damageClass: 'physical',
    pp: 20,
    maxPp: 20,
    priority: 0,
    ailment: null,
    ailmentChance: 0,
    ...overrides,
  }
}

const MOVES = [
  move('flamethrower', { type: 'fire', pp: 15, maxPp: 15 }),
  move('quick-attack'),
  move('slash'),
  move('struggle'),
]

function setup(moves: readonly BattleMove[] = MOVES, busy = false) {
  const onPick = vi.fn()
  render(<MoveMenu moves={moves} busy={busy} onPick={onPick} />)
  return { onPick, buttons: screen.getAllByRole('button') }
}

describe('MoveMenu', () => {
  it('offers one button per slot, carrying the type by name as well as by colour', () => {
    const { buttons } = setup()

    expect(buttons).toHaveLength(4)
    expect(buttons[0]).toHaveTextContent('fire')
    expect(buttons[0]).toHaveTextContent('Flamethrower')
  })

  it('shows what is left of a move against what it started with', () => {
    const { buttons } = setup()

    expect(buttons[0]).toHaveTextContent('15/15')
  })

  it('hands back the slot that was picked', () => {
    const { onPick, buttons } = setup()
    fireEvent.click(buttons[2])

    expect(onPick).toHaveBeenCalledExactlyOnceWith(2)
  })

  // Locked with `aria-disabled`, not `disabled`, so the slot keeps its place in
  // the tab order — which is why the click has to be refused by hand.
  it('locks every slot while the turn is still playing out', () => {
    const { onPick, buttons } = setup(MOVES, true)
    fireEvent.click(buttons[0])

    expect(buttons.every((button) => button.getAttribute('aria-disabled') === 'true')).toBe(true)
    expect(onPick).not.toHaveBeenCalled()
  })

  it('locks a slot with no PP left', () => {
    const { onPick, buttons } = setup([move('spent', { pp: 0 }), ...MOVES.slice(1)])
    fireEvent.click(buttons[0])

    expect(buttons[0]).toHaveAttribute('aria-disabled', 'true')
    expect(buttons[1]).toHaveAttribute('aria-disabled', 'false')
    expect(onPick).not.toHaveBeenCalled()
  })

  it('offers struggle rather than four dead buttons when everything is spent', () => {
    const { onPick, buttons } = setup(MOVES.map((entry) => ({ ...entry, pp: 0 })))
    fireEvent.click(buttons[0])

    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveTextContent('Struggle')
    expect(onPick).toHaveBeenCalledExactlyOnceWith(0)
  })
})
