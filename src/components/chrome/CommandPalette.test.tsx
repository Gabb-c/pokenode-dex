import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { searchIndexQuery, type DexEntry } from '@/api/queries/search-index'
import { CommandPalette } from './CommandPalette'

const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

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
  // Listed before `mime-jr`, so ranking rather than index order has to put it second.
  entry(122, 'mr-mime'),
  entry(439, 'mime-jr'),
  entry(1, 'bulbasaur'),
  entry(4, 'charmander'),
  entry(7, 'squirtle'),
  entry(150, 'mewtwo'),
  entry(151, 'mew'),
  entry(94, 'gengar'),
]

/**
 * The index is seeded, so the palette's `enabled` gate never reaches the network.
 * Passing none leaves the query pending, which is the state before it arrives.
 */
function setup(index: DexEntry[] | null = INDEX) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (index) queryClient.setQueryData(searchIndexQuery.queryKey, index)
  else queryClient.setQueryDefaults(searchIndexQuery.queryKey, { queryFn: () => new Promise(() => {}) })

  render(
    <QueryClientProvider client={queryClient}>
      <CommandPalette />
    </QueryClientProvider>,
  )
}

// A closed dialog is out of the accessibility tree, so the field is only
// reachable once the palette is open.
const open = () => fireEvent.keyDown(window, { key: 'k', metaKey: true })
const field = () => screen.getByRole('combobox')
const options = () => within(screen.getByRole('listbox')).getAllByRole('option')
const selected = () => options().find((item) => item.getAttribute('aria-selected') === 'true')

beforeEach(() => navigate.mockClear())

describe('CommandPalette', () => {
  it('opens on the shortcut and closes on a second press', () => {
    setup()
    const dialog = screen.getByRole('dialog', { hidden: true })

    open()
    expect(dialog).toHaveAttribute('open')

    open()
    expect(dialog).not.toHaveAttribute('open')
  })

  it('ranks a prefix match above a substring one', () => {
    setup()
    open()
    const input = field()

    fireEvent.change(input, { target: { value: 'mime' } })

    expect(options().map((item) => item.textContent)).toEqual(['#0439Mime Jr', '#0122Mr Mime'])
  })

  it('caps the list rather than rendering the whole dex', () => {
    setup()
    open()
    const input = field()

    fireEvent.change(input, { target: { value: '' } })

    expect(options()).toHaveLength(8)
  })

  it('moves the selection with the arrow keys, stopping at each end', () => {
    setup()
    open()
    const input = field()
    fireEvent.change(input, { target: { value: 'chu' } })

    expect(selected()).toHaveTextContent('Pikachu')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(selected()).toHaveTextContent('Raichu')

    // Already at the top, so the second press has nowhere to go.
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(selected()).toHaveTextContent('Pikachu')
  })

  it('navigates to the highlighted entry on Enter', () => {
    setup()
    open()
    const input = field()
    fireEvent.change(input, { target: { value: 'chu' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      to: '/pokemon/$name',
      params: { name: 'raichu' },
    })
  })

  it('navigates on a click, and closes behind itself', () => {
    setup()
    open()
    const input = field()
    fireEvent.change(input, { target: { value: 'eevee' } })

    fireEvent.click(screen.getByRole('option', { name: /eevee/i }))

    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      to: '/pokemon/$name',
      params: { name: 'eevee' },
    })
    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open')
  })

  it('matches a bare dex number', () => {
    setup()
    open()
    const input = field()

    fireEvent.change(input, { target: { value: '150' } })

    expect(options()).toHaveLength(1)
    expect(options()[0]).toHaveTextContent('Mewtwo')
  })

  it('says nothing matches rather than sitting empty', () => {
    setup()
    open()
    const input = field()

    fireEvent.change(input, { target: { value: 'zzzz' } })

    expect(screen.getByText('Nothing matches.')).toBeInTheDocument()
  })

  it('reports it is still loading when the index has not arrived', () => {
    setup(null)
    open()

    expect(screen.getByText('Loading the dex…')).toBeInTheDocument()
  })
})
