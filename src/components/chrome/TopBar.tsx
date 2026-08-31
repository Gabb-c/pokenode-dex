import { Link } from '@tanstack/react-router'
import { NAV } from '@/lib/nav'
import { openCommandPalette } from '@/lib/palette'
import { LanguagePicker } from './LanguagePicker'
import { ThemeToggle } from './ThemeToggle'

export function TopBar() {
  return (
    <header className="z-20 border-b border-line bg-surface-0/90 backdrop-blur">
      {/* Wraps rather than overflowing: eight controls do not fit a phone in one row. */}
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <Link to="/pokemon" className="font-semibold tracking-tight text-ink-hi">
          Pokenode<span className="text-accent">·</span>Dex
        </Link>

        {/*
         * Twelve links are ~800px of unbreakable labels, which fits no phone and
         * not much of a laptop either. Wrapping them costs three rows on a
         * phone, and the shell is fixed with only `main` scrolling — so the bar
         * would take the reading area rather than give it up. It scrolls
         * sideways instead, the same trade the status rail makes at the foot of
         * the page. `basis-full` still gives the row its own line below `sm`.
         */}
        <nav className="order-last flex min-w-0 basis-full items-center gap-1 overflow-x-auto overscroll-x-contain sm:order-none sm:basis-auto">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="rounded-[var(--radius-well)] px-2.5 py-1.5 text-sm whitespace-nowrap text-ink-mid transition-colors hover:text-ink-hi sm:py-1"
              activeProps={{ className: 'bg-surface-2 text-ink-hi' }}
              activeOptions={{ exact: false }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Touch has no ⌘K, so the hint is a real control everywhere and the
              shortcut is only the label a keyboard gets. */}
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Search the dex"
            className="well px-2 py-0.5 text-micro text-ink-lo transition-colors hover:text-ink-hi"
          >
            <span className="sm:hidden">Search</span>
            <kbd className="hidden sm:block">⌘K</kbd>
          </button>
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
