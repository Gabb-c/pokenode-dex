import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen, within } from '@testing-library/react'
import type { Move } from 'pokenode-ts'
import type { LearnedMove } from '@/api/queries/moves'
import { MoveTable } from './MoveTable'

// The type chips navigate; the table itself has nothing to route.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

interface Fixture {
  name: string
  type: string
  damageClass?: string | null
  power?: number | null
  accuracy?: number | null
  pp?: number | null
}

/** Only the fields the table reads; a whole `Move` is two hundred lines of nothing. */
function learned(level: number, move: Fixture): LearnedMove {
  const { name, type, damageClass = 'physical', power = 40, accuracy = 100, pp = 35 } = move
  return {
    level,
    move: {
      id: name.length,
      name,
      names: [],
      type: { name: type, url: '' },
      damage_class: damageClass ? { name: damageClass, url: '' } : null,
      power,
      accuracy,
      pp,
    } as unknown as Move,
  }
}

const row = (name: string) => screen.getByRole('row', { name: new RegExp(name, 'i') })

describe('MoveTable', () => {
  it('reads a status move without power as having none, not as zero', () => {
    render(
      <MoveTable
        moves={[learned(1, { name: 'growl', type: 'normal', damageClass: 'status', power: null })]}
      />,
    )

    const cells = within(row('growl')).getAllByRole('cell')
    expect(cells.map((cell) => cell.textContent)).toEqual(['1', 'Growl', 'normal', 'Status', '—', '100', '35'])
  })

  it('treats the zero the docs describe the same way as the null the endpoint sends', () => {
    render(<MoveTable moves={[learned(1, { name: 'harden', type: 'normal', power: 0 })]} />)

    expect(within(row('harden')).getAllByRole('cell')[4]).toHaveTextContent('—')
  })

  it('names a level of zero in a level-up list as what it means', () => {
    render(
      <MoveTable
        moves={[
          learned(0, { name: 'air-slash', type: 'flying' }),
          learned(1, { name: 'ember', type: 'fire' }),
        ]}
      />,
    )

    expect(within(row('air slash')).getAllByRole('cell')[0]).toHaveTextContent('Evo.')
  })

  it('drops the level column when no method in the tab teaches by one', () => {
    render(<MoveTable moves={[learned(0, { name: 'flamethrower', type: 'fire' })]} />)

    expect(screen.queryByRole('columnheader', { name: 'Lv' })).not.toBeInTheDocument()
    expect(within(row('flamethrower')).getAllByRole('cell')).toHaveLength(6)
  })

  it('always spells the type out, so colour is never carrying it alone', () => {
    render(<MoveTable moves={[learned(1, { name: 'ember', type: 'fire' })]} />)

    expect(within(row('ember')).getByText('fire')).toBeInTheDocument()
  })
})
