import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { DexEntry } from '@/api/queries/search-index'
import { GuessBox } from './GuessBox'

const entry = (id: number, name: string): DexEntry => ({
  id,
  name,
  no: String(id).padStart(4, '0'),
})

const INDEX = [
  entry(25, 'pikachu'),
  entry(26, 'raichu'),
  entry(172, 'pichu'),
  entry(133, 'eevee'),
  entry(122, 'mr-mime'),
]

function setup() {
  const onGuess = vi.fn()
  render(<GuessBox index={INDEX} onGuess={onGuess} />)
  return { onGuess, field: screen.getByRole('combobox') }
}

const options = () => within(screen.getByRole('listbox')).getAllByRole('option')
const selected = () => options().find((item) => item.getAttribute('aria-selected') === 'true')

describe('GuessBox', () => {
  it('offers nothing for a single letter, which would hand the round away', () => {
    const { field } = setup()

    fireEvent.change(field, { target: { value: 'p' } })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('suggests from the second letter, prefix matches first', () => {
    const { field } = setup()

    fireEvent.change(field, { target: { value: 'pi' } })

    expect(options().map((item) => item.textContent)).toEqual(['#0025Pikachu', '#0172Pichu'])
  })

  it('submits the highlighted suggestion, and clears behind itself', () => {
    const { field, onGuess } = setup()
    fireEvent.change(field, { target: { value: 'chu' } })
    expect(selected()).toHaveTextContent('Pikachu')

    fireEvent.keyDown(field, { key: 'ArrowDown' })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onGuess).toHaveBeenCalledExactlyOnceWith('raichu')
    expect(field).toHaveValue('')
  })

  it('submits what was typed when nothing is suggested', () => {
    const { field, onGuess } = setup()

    fireEvent.change(field, { target: { value: 'zubat' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onGuess).toHaveBeenCalledExactlyOnceWith('zubat')
  })

  it('says nothing on an empty field', () => {
    const { field, onGuess } = setup()

    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onGuess).not.toHaveBeenCalled()
  })

  it('submits a suggestion that is clicked', () => {
    const { field, onGuess } = setup()
    fireEvent.change(field, { target: { value: 'eev' } })

    fireEvent.click(screen.getByRole('option', { name: /eevee/i }))

    expect(onGuess).toHaveBeenCalledExactlyOnceWith('eevee')
  })
})
