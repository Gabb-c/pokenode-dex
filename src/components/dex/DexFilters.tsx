import type { CSSProperties, ReactNode } from 'react'
import { BATTLE_TYPES, typeVar, type TypeName } from '@/lib/types'

export interface DexFilterState {
  q: string
  types: TypeName[]
}

interface DexFiltersProps {
  value: DexFilterState
  showing: number
  total: number
  /** Whether anything is filtered, including an axis passed as `children`. */
  active: boolean
  /** The query alone: it reaches the URL debounced, the rest immediately. */
  onQueryChange: (next: string) => void
  onChange: (next: Partial<DexFilterState>) => void
  onClear: () => void
  /** The view's own axis, beside the shared controls — the dex passes a generation. */
  children?: ReactNode
}

export function DexFilters({
  value,
  showing,
  total,
  active,
  onQueryChange,
  onChange,
  onClear,
  children,
}: DexFiltersProps) {
  function toggleType(name: TypeName) {
    onChange({
      types: value.types.includes(name)
        ? value.types.filter((type) => type !== name)
        : [...value.types, name],
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={value.q}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filter by name or number…"
          aria-label="Filter the dex"
          className="well w-full max-w-xs px-3 py-1.5 text-sm text-ink-hi placeholder:text-ink-lo"
        />

        {children}

        <span className="text-micro text-ink-lo">
          {/* Keyed on the count so a filter landing is visible in the figure. */}
          <output key={showing} className="pop" data-numeric>
            {showing}
          </output>{' '}
          of <output data-numeric>{total}</output>
        </span>

        {active && (
          <button
            type="button"
            onClick={onClear}
            className="btn ml-auto px-2 py-0.5 text-micro text-ink-lo hover:text-ink-hi"
          >
            clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by type">
        {BATTLE_TYPES.map((name) => {
          const selected = value.types.includes(name)
          return (
            <button
              key={name}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleType(name)}
              style={{ '--t': typeVar(name) } as CSSProperties}
              className={`type-chip transition-[opacity,background-color,border-color] ${
                selected ? '' : 'opacity-45 hover:opacity-80'
              }`}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
