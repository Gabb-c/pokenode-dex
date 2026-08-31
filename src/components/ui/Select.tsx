import type { ReactNode } from 'react'

interface SelectProps {
  /** The field name. Visible beside the control unless `hideLabel`. */
  label: string
  value: string
  onChange: (next: string) => void
  /** The `<option>` list. Built by the caller: several are conditional. */
  children: ReactNode
  /** For a control whose purpose is clear from its own value, like the language. */
  hideLabel?: boolean
  /** The rail and the top bar run at `micro`; everything else at `sm`. */
  size?: 'sm' | 'micro'
}

/**
 * A labelled `<select>`.
 *
 * The label is part of the control rather than something each caller wraps it
 * in: the sizing, the `well` surface and the pairing are one decision, and
 * seven call sites had drifted into seven copies of it.
 *
 * The element stays a bare `<select>` so `index.css`'s coarse-pointer block —
 * the 16px iOS floor and the 2rem target minimum — still reaches it.
 */
export function Select({ label, value, onChange, children, hideLabel, size = 'sm' }: SelectProps) {
  return (
    // `text-transform` inherits into the `<select>`, so the casing that suits a
    // visible field name reaches the options too. A hidden label has no name to
    // case, and its values — language codes — are lowercase.
    <label
      className={`flex items-center gap-2 text-micro text-ink-lo ${hideLabel ? '' : 'uppercase'}`}
    >
      <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`well cursor-pointer text-ink-mid ${
          size === 'micro' ? 'px-2 py-0.5 text-micro' : 'px-2 py-1 text-sm'
        }`}
      >
        {children}
      </select>
    </label>
  )
}
