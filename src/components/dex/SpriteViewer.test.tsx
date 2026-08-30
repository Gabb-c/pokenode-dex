import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SpriteViewer } from './SpriteViewer'

const FALLBACK = /no image for this combination/i
const TINT = 'var(--type-grass)'

/**
 * The route keeps this component mounted across a change of `id`, so anything
 * it remembers about one Pokémon is still there for the next one.
 */
describe('SpriteViewer', () => {
  it('reports a sprite the repository does not have', () => {
    render(<SpriteViewer id={1} name="Bulbasaur" tint={TINT} />)

    fireEvent.error(screen.getByAltText('Bulbasaur'))

    expect(screen.getByText(FALLBACK)).toBeInTheDocument()
    expect(screen.queryByAltText('Bulbasaur')).not.toBeInTheDocument()
  })

  it('does not carry that failure to the next Pokémon', () => {
    const { rerender } = render(<SpriteViewer id={1} name="Bulbasaur" tint={TINT} />)
    fireEvent.error(screen.getByAltText('Bulbasaur'))

    rerender(<SpriteViewer id={2} name="Ivysaur" tint={TINT} />)

    expect(screen.getByAltText('Ivysaur')).toBeInTheDocument()
    expect(screen.queryByText(FALLBACK)).not.toBeInTheDocument()
  })

  it('does not carry it to another sprite set either', () => {
    render(<SpriteViewer id={1} name="Bulbasaur" tint={TINT} />)
    fireEvent.error(screen.getByAltText('Bulbasaur'))

    fireEvent.click(screen.getByRole('radio', { name: 'home' }))

    expect(screen.getByAltText('Bulbasaur')).toBeInTheDocument()
  })

  it('keeps reporting the one combination that actually failed', () => {
    render(<SpriteViewer id={1} name="Bulbasaur" tint={TINT} />)
    fireEvent.error(screen.getByAltText('Bulbasaur'))
    fireEvent.click(screen.getByRole('radio', { name: 'home' }))

    fireEvent.click(screen.getByRole('radio', { name: 'official artwork' }))

    expect(screen.getByText(FALLBACK)).toBeInTheDocument()
  })

  it('disables the facets the current set does not publish', () => {
    render(<SpriteViewer id={1} name="Bulbasaur" tint={TINT} />)

    // official-artwork has shiny sprites, but no back or gendered ones.
    expect(screen.getByRole('checkbox', { name: 'shiny' })).toBeEnabled()
    expect(screen.getByRole('checkbox', { name: 'back' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'female' })).toBeDisabled()

    fireEvent.click(screen.getByRole('radio', { name: 'default' }))

    expect(screen.getByRole('checkbox', { name: 'back' })).toBeEnabled()
  })
})
