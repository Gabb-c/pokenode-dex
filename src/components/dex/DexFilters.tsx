import type { NamedAPIResource, Generation } from 'pokenode-ts'
import { Select } from '@/components/ui/Select'
import { generationLabel } from '@/lib/format'
import { BATTLE_TYPES, typeVar, type TypeName } from '@/lib/types'
import type { CSSProperties } from 'react'

export interface DexFilterState {
  q: string
  gen: string
  types: TypeName[]
}

interface DexFiltersProps {
  value: DexFilterState
  generations: NamedAPIResource<Generation>[] | undefined
  showing: number
  total: number
  /** The query alone: it reaches the URL debounced, the rest immediately. */
  onQueryChange: (next: string) => void
  onChange: (next: Partial<DexFilterState>) => void
}

export function DexFilters({
  value,
  generations,
  showing,
  total,
  onQueryChange,
  onChange,
}: DexFiltersProps) {
  const filtered = value.q !== '' || value.gen !== '' || value.types.length > 0

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

        <Select label="Generation" value={value.gen} onChange={(gen) => onChange({ gen })}>
          <option value="">any</option>
          {generations?.map((generation) => (
            <option key={generation.name} value={generation.name}>
              {generationLabel(generation.name)}
            </option>
          ))}
        </Select>

        <span className="text-micro text-ink-lo">
          {/* Keyed on the count so a filter landing is visible in the figure. */}
          <output key={showing} className="pop" data-numeric>
            {showing}
          </output>{' '}
          of <output data-numeric>{total}</output>
        </span>

        {filtered && (
          <button
            type="button"
            onClick={() => {
              onQueryChange('')
              onChange({ q: '', gen: '', types: [] })
            }}
            className="btn ml-auto px-2 py-0.5 text-micro text-ink-lo hover:text-ink-hi"
          >
            clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by type">
        {BATTLE_TYPES.map((name) => {
          const active = value.types.includes(name)
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              onClick={() => toggleType(name)}
              style={{ '--t': typeVar(name) } as CSSProperties}
              className={`type-chip transition-[opacity,background-color,border-color] ${
                active ? '' : 'opacity-45 hover:opacity-80'
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
