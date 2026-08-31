import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DexFilters, type DexFilterState } from './DexFilters'

const EMPTY: DexFilterState = { q: '', types: [] }

function setup(value: Partial<DexFilterState> = {}, children?: React.ReactNode) {
  const onChange = vi.fn()
  const onQueryChange = vi.fn()
  const onClear = vi.fn()
  const merged = { ...EMPTY, ...value }
  render(
    <DexFilters
      value={merged}
      showing={12}
      total={1302}
      active={merged.q !== '' || merged.types.length > 0}
      onQueryChange={onQueryChange}
      onChange={onChange}
      onClear={onClear}
    >
      {children}
    </DexFilters>,
  )
  return { onChange, onQueryChange, onClear }
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

  it('renders the axis the view brought with it', () => {
    setup({}, <button type="button">Generation</button>)

    expect(screen.getByRole('button', { name: 'Generation' })).toBeInTheDocument()
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

  it('leaves clearing to the view, which owns the axes it does not', () => {
    const { onClear } = setup({ q: 'pika', types: ['fire'] })

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }))

    expect(onClear).toHaveBeenCalledOnce()
  })
})
