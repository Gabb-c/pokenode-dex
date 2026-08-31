import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { searchIndexQuery, type DexEntry } from '@/api/queries/search-index'
import { matchDex } from '@/lib/dex/match'
import { dexNo, humanize } from '@/lib/format'
import { matchNav, type NavItem } from '@/lib/nav'
import { onOpenCommandPalette } from '@/lib/palette'

/** A section to jump to, or a Pokémon to open. */
type Result =
  | { kind: 'section'; id: string; item: NavItem }
  | { kind: 'pokemon'; id: string; entry: DexEntry }

export function CommandPalette() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()

  // Only fetched once the palette is opened; the dex route usually has it already.
  const [enabled, setEnabled] = useState(false)
  const { data: index } = useQuery({ ...searchIndexQuery, enabled })

  const results = useMemo<Result[]>(
    () => [
      ...matchNav(query).map((item) => ({ kind: 'section' as const, id: `nav:${item.to}`, item })),
      ...matchDex(index ?? [], query).map((entry) => ({
        kind: 'pokemon' as const,
        id: `dex:${entry.id}`,
        entry,
      })),
    ],
    [index, query],
  )

  useEffect(() => {
    const toggle = () => {
      setEnabled(true)
      const dialog = dialogRef.current
      if (dialog?.open) dialog.close()
      else dialog?.showModal()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      toggle()
    }
    addEventListener('keydown', onKeyDown)
    const unsubscribe = onOpenCommandPalette(toggle)
    return () => {
      removeEventListener('keydown', onKeyDown)
      unsubscribe()
    }
  }, [])

  function go(result: Result | undefined) {
    if (!result) return
    dialogRef.current?.close()
    setQuery('')
    if (result.kind === 'section') void navigate({ to: result.item.to })
    else void navigate({ to: '/pokemon/$name', params: { name: result.entry.name } })
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Search the dex"
      onClose={() => setActive(0)}
      // No display utility here: an author `display` would beat the UA's
      // `dialog:not([open]) { display: none }` and leave the palette on screen.
      className="panel m-auto w-[min(32rem,90vw)] bg-surface-1 p-0 text-ink-mid backdrop:bg-black/50"
    >
      <input
        type="text"
        role="combobox"
        aria-expanded
        aria-controls="palette-results"
        aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
        autoFocus
        value={query}
        placeholder="Search Pokémon and sections…"
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
            go(results[active])
          }
        }}
        className="w-full border-b border-line bg-transparent px-4 py-3 text-ink-hi outline-none placeholder:text-ink-lo"
      />

      {/* Keyed on whether the index has landed, not on the query: a fade per
          keystroke would be flicker, while the list replacing "Loading the dex…"
          is a real state change. */}
      <ul
        key={index ? 'ready' : 'loading'}
        id="palette-results"
        role="listbox"
        aria-label="Results"
        // The keyboard takes half a phone, so the cap follows the viewport that
        // is left rather than a fixed 20rem.
        className="fade-in max-h-[min(20rem,55dvh)] overflow-y-auto overscroll-contain"
      >
        {results.length === 0 ? (
          <li className="px-4 py-3 text-sm text-ink-lo">
            {index ? 'Nothing matches.' : 'Loading the dex…'}
          </li>
        ) : (
          results.map((result, position) => (
            <li
              key={result.id}
              id={`palette-${result.id}`}
              role="option"
              aria-selected={position === active}
              onMouseEnter={() => setActive(position)}
              onClick={() => go(result)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-sm transition-colors ${
                position === active ? 'bg-surface-2 text-ink-hi' : ''
              }`}
            >
              {result.kind === 'section' ? (
                <>
                  <span className="text-micro uppercase text-ink-lo">go</span>
                  {result.item.label}
                </>
              ) : (
                <>
                  <span className="text-micro text-ink-lo" data-numeric>
                    {dexNo(result.entry.id)}
                  </span>
                  {humanize(result.entry.name)}
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </dialog>
  )
}

