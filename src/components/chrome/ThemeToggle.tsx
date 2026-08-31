import { useTheme, type ThemeChoice } from '@/hooks/use-theme'

const CHOICES: readonly { value: ThemeChoice; label: string; glyph: string }[] = [
  { value: 'light', label: 'Light theme', glyph: '☀' },
  { value: 'system', label: 'Match system theme', glyph: '◐' },
  { value: 'dark', label: 'Dark theme', glyph: '☾' },
]

export function ThemeToggle() {
  const [choice, setChoice] = useTheme()

  return (
    <div role="radiogroup" aria-label="Theme" className="well flex gap-px p-px">
      {CHOICES.map(({ value, label, glyph }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          aria-label={label}
          title={label}
          onClick={() => setChoice(value)}
          className={`rounded-[var(--radius-control)] px-2 py-0.5 text-xs transition-colors ${
            choice === value
              ? 'bg-accent text-accent-ink'
              : 'text-ink-lo hover:text-ink-hi'
          }`}
        >
          {glyph}
        </button>
      ))}
    </div>
  )
}
