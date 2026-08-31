import type { GenerationName } from 'pokenode-ts'
import { GENERATION_NAMES } from '@/lib/generation'
import { generationLabel } from '@/lib/format'

interface GenerationPickerProps {
  value: GenerationName | undefined
  onChange: (next: GenerationName | undefined) => void
}

/** The chart to read a page against; absent means the one in force today. */
export function GenerationPicker({ value, onChange }: GenerationPickerProps) {
  return (
    <label className="flex items-center gap-2 text-micro uppercase text-ink-lo">
      Chart
      <select
        value={value ?? ''}
        onChange={(event) => onChange((event.target.value || undefined) as GenerationName | undefined)}
        className="well cursor-pointer px-2 py-1 text-sm text-ink-mid"
      >
        <option value="">current</option>
        {GENERATION_NAMES.map((name) => (
          <option key={name} value={name}>
            {generationLabel(name)}
          </option>
        ))}
      </select>
    </label>
  )
}
