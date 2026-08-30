import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Generation, NamedAPIResource } from 'pokenode-ts'
import { DexFilters, type DexFilterState } from './DexFilters'

const GENERATIONS = [
  { name: 'generation-i', url: '' },
  { name: 'generation-ii', url: '' },
] as NamedAPIResource<Generation>[]

const EMPTY: DexFilterState = { q: '', gen: '', types: [] }

function setup(value: Partial<DexFilterState> = {}) {
  const onChange = vi.fn()
  const onQueryChange = vi.fn()
  render(
    <DexFilters
      value={{ ...EMPTY, ...value }}
      generations={GENERATIONS}
      showing={12}
      total={1302}
      onQueryChange={onQueryChange}
      onChange={onChange}
    />,
  )
  return { onChange, onQueryChange }
}

describe('DexFilters', () => {
  it('reports a keystroke on the query channel, not the shared one', () => {
    const { onChange, onQueryChange } = setup()

    fireEvent.change(screen.getByLabelText('Filter the dex'), { target: { value: 'pika' } })

    expect(onQueryChange).toHaveBeenCalledExactlyOnceWith('pika')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('adds a type that is not yet selected', () => {
    const { onChange } = setup()

    fireEvent.click(screen.getByRole('button', { name: 'fire' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith({ types: ['fire'] })
  })

  it('removes an already-selected type, leaving the rest', () => {
    const { onChange } = setup({ types: ['fire', 'water'] })

    fireEvent.click(screen.getByRole('button', { name: 'fire' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith({ types: ['water'] })
  })

  it('marks the selected types as pressed', () => {
    setup({ types: ['fire'] })

    expect(screen.getByRole('button', { name: 'fire' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'water' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('lists the generations it was given, titled', () => {
    setup()

    expect(screen.getByRole('option', { name: 'Gen I' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Gen II' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'any' })).toBeInTheDocument()
  })

  it('reports a chosen generation', () => {
    const { onChange } = setup()

    fireEvent.change(screen.getByLabelText(/generation/i), { target: { value: 'generation-ii' } })

    expect(onChange).toHaveBeenCalledExactlyOnceWith({ gen: 'generation-ii' })
  })

  it('shows the counts', () => {
    setup()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('1302')).toBeInTheDocument()
  })

  it('offers no way to clear when nothing is filtering', () => {
    setup()
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument()
  })

  it('clears the debounced field and the rest together', () => {
    const { onChange, onQueryChange } = setup({ q: 'pika', types: ['fire'] })

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }))

    expect(onQueryChange).toHaveBeenCalledExactlyOnceWith('')
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ q: '', gen: '', types: [] })
  })
})
