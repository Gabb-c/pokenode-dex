import type { CSSProperties } from 'react'

/** Blissey's 255 HP is the highest base stat in the games; the scale is fixed to it. */
const MAX_BASE_STAT = 255

interface StatBarProps {
  label: string
  value: number
  /** The Pokémon's primary type, so the bar reads as belonging to it. */
  tint: string
  /** The top of the scale. Base stats keep the default; raised ones are larger. */
  max?: number
}

export function StatBar({ label, value, tint, max = MAX_BASE_STAT }: StatBarProps) {
  const style = { '--t': tint, '--fill': `${Math.min(100, (value / max) * 100)}%` } as CSSProperties

  return (
    <div className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-3" style={style}>
      <span className="text-micro uppercase text-ink-lo">{label}</span>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className="h-full rounded-full bg-[var(--t)] motion-safe:animate-[stat-fill_600ms_var(--ease-instrument)]"
          style={{ width: 'var(--fill)' }}
        />
      </div>
      <output className="text-right text-sm text-ink-hi">{value}</output>
    </div>
  )
}
