import type { GenerationName } from 'pokenode-ts'
import { Select } from '@/components/ui/Select'
import { GENERATION_NAMES } from '@/lib/generation'
import { generationLabel } from '@/lib/format'

interface GenerationPickerProps {
  value: GenerationName | undefined
  onChange: (next: GenerationName | undefined) => void
}

/** The chart to read a page against; absent means the one in force today. */
export function GenerationPicker({ value, onChange }: GenerationPickerProps) {
  return (
    <Select
      label="Chart"
      value={value ?? ''}
      onChange={(next) => onChange((next || undefined) as GenerationName | undefined)}
    >
      <option value="">current</option>
      {GENERATION_NAMES.map((name) => (
        <option key={name} value={name}>
          {generationLabel(name)}
        </option>
      ))}
    </Select>
  )
}
