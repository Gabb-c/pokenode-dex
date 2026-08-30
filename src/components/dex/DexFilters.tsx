import type { NamedAPIResource, Generation } from 'pokenode-ts'
import { humanize } from '@/lib/format'
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
  onChange: (next: Partial<DexFilterState>) => void
}

export function DexFilters({ value, generations, showing, total, onChange }: DexFiltersProps) {
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
          onChange={(event) => onChange({ q: event.target.value })}
          placeholder="Filter by name or number…"
          aria-label="Filter the dex"
          className="well w-full max-w-xs px-3 py-1.5 text-sm text-ink-hi placeholder:text-ink-lo"
        />

        <label className="flex items-center gap-2 text-micro uppercase text-ink-lo">
          Generation
          <select
            value={value.gen}
            onChange={(event) => onChange({ gen: event.target.value })}
            className="well cursor-pointer px-2 py-1 text-sm text-ink-mid"
          >
            <option value="">any</option>
            {generations?.map((generation) => (
              <option key={generation.name} value={generation.name}>
                {humanize(generation.name.replace('generation-', ''))}
              </option>
            ))}
          </select>
        </label>

        <span className="text-micro text-ink-lo">
          <output data-numeric>{showing}</output> of <output data-numeric>{total}</output>
        </span>

        {filtered && (
          <button
            type="button"
            onClick={() => onChange({ q: '', gen: '', types: [] })}
            className="ml-auto rounded-[3px] border border-line px-2 py-0.5 text-micro text-ink-lo hover:border-line-strong hover:text-ink-hi"
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
              className={`type-chip transition-opacity ${active ? '' : 'opacity-45 hover:opacity-80'}`}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
