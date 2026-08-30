import { useState } from 'react'
import type { DexEntry } from '@/api/queries/search-index'
import { matchDex } from '@/lib/dex-match'
import { dexNo, humanize } from '@/lib/format'

const SUGGESTIONS = 5

/** One letter matches eight Pokémon, which would hand the round away. */
const MIN_TERM = 2

interface GuessBoxProps {
  index: readonly DexEntry[]
  onGuess: (name: string) => void
}

export function GuessBox({ index, onGuess }: GuessBoxProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const term = query.trim()
  const results = term.length >= MIN_TERM ? matchDex(index, term, SUGGESTIONS) : []
  const open = results.length > 0

  function submit() {
    // A name typed in full needs no arrow keys; a highlighted suggestion wins
    // when there is one.
    const guess = open ? results[active].name : term
    if (!guess) return
    setQuery('')
    setActive(0)
    onGuess(guess)
  }

  return (
    <div className="relative w-full max-w-sm">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="guess-results"
        aria-activedescendant={open ? `guess-${results[active].id}` : undefined}
        aria-label="Name the Pokémon"
        autoFocus
        autoComplete="off"
        value={query}
        placeholder="Who's that Pokémon?"
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActive((current) => Math.min(current + 1, results.length - 1))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((current) => Math.max(current - 1, 0))
          } else if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          }
        }}
        className="well w-full px-3 py-2 text-ink-hi placeholder:text-ink-lo"
      />

      {open && (
        <ul
          id="guess-results"
          role="listbox"
          aria-label="Suggestions"
          className="panel rise-fast absolute z-10 mt-1 w-full overflow-hidden"
        >
          {results.map((entry, position) => (
            <li
              key={entry.id}
              id={`guess-${entry.id}`}
              role="option"
              aria-selected={position === active}
              onMouseEnter={() => setActive(position)}
              onClick={() => {
                setQuery('')
                setActive(0)
                onGuess(entry.name)
              }}
              className={`flex cursor-pointer items-center gap-3 px-3 py-1.5 text-sm transition-colors duration-150 ${
                position === active ? 'bg-surface-2 text-ink-hi' : ''
              }`}
            >
              <span className="text-micro text-ink-lo" data-numeric>
                {dexNo(entry.id)}
              </span>
              {humanize(entry.name)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
