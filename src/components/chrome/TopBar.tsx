import { Link } from '@tanstack/react-router'
import { LanguagePicker } from './LanguagePicker'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { to: '/pokemon', label: 'Dex' },
  { to: '/moves', label: 'Moves' },
  { to: '/types', label: 'Types' },
  { to: '/play', label: 'Play' },
  { to: '/about', label: 'How it works' },
] as const

export function TopBar() {
  return (
    <header className="z-20 border-b border-line bg-surface-0/90 backdrop-blur">
      {/* Wraps rather than overflowing: eight controls do not fit a phone in one row. */}
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <Link to="/pokemon" className="font-semibold tracking-tight text-ink-hi">
          Pokenode<span className="text-accent">·</span>Dex
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="rounded-[4px] px-2.5 py-1 text-sm whitespace-nowrap text-ink-mid transition-colors hover:text-ink-hi"
              activeProps={{ className: 'bg-surface-2 text-ink-hi' }}
              activeOptions={{ exact: false }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <kbd className="well hidden px-2 py-0.5 text-micro text-ink-lo sm:block">⌘K</kbd>
          <a
            href="https://pokenode-ts.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="hidden text-micro uppercase text-ink-lo hover:text-ink-hi sm:block"
          >
            pokenode-ts ↗
          </a>
          <LanguagePicker />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
