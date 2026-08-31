import type { ReactNode } from 'react'

interface DetailHeaderProps {
  /** The resource's own number, set in the mono face. */
  id: ReactNode
  title: string
  /** The genus, or the generation a move arrived in. */
  subtitle?: ReactNode
  /** Type chips and the like, pushed to the trailing edge. */
  aside?: ReactNode
}

/**
 * The masthead both detail pages share.
 *
 * The rule beneath it is a `border-image` gradient rather than a border colour,
 * so it fades out across the width; it reads `--t`, which the page sets from
 * the primary type on the `<article>` around this.
 */
export function DetailHeader({ id, title, subtitle, aside }: DetailHeaderProps) {
  return (
    <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 border-transparent pb-2 [border-image:linear-gradient(to_right,var(--t),transparent_60%)_1]">
      <span className="text-lg text-ink-lo" data-numeric>
        {id}
      </span>
      <h1 className="text-3xl tracking-tight">{title}</h1>
      {subtitle}
      {aside && <div className="ml-auto flex items-center gap-2">{aside}</div>}
    </header>
  )
}
