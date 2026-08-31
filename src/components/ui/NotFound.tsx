import { Link, type LinkProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'

interface NotFoundProps {
  /** The eyebrow. Says `404 · not retried` where a 4xx deliberately never was. */
  eyebrow: string
  children: ReactNode
  back: { to: LinkProps['to']; label: string }
}

/** What the app says when an address has nothing behind it. */
export function NotFound({ eyebrow, children, back }: NotFoundProps) {
  return (
    <div className="panel mx-auto my-16 max-w-xl p-6">
      <p className="text-micro uppercase text-ink-lo">{eyebrow}</p>
      <h2 className="mt-2 text-lg">{children}</h2>
      <Link to={back.to} className="mt-5 inline-block text-sm text-accent">
        {back.label}
      </Link>
    </div>
  )
}
