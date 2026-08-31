import { createFileRoute } from '@tanstack/react-router'
import { extractDeclaration } from '@/lib/extract-declaration'
import { FEATURES, anchor } from './-features'

export const Route = createFileRoute('/about')({ component: About })

function About() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 sm:gap-10">
      <header>
        <h1 className="text-2xl tracking-tight">How this app uses pokenode-ts</h1>
        <p className="mt-2 text-sm text-ink-mid">
          Every snippet below is imported from this repository with Vite&rsquo;s{' '}
          <code className="font-mono">?raw</code>, so it is the code that is actually
          running — not a copy that can go stale.
        </p>
      </header>

      {/* Ninety-odd lines of source is a long scroll on a phone; the chips are
          the way past one. They bleed to the screen edge and scroll sideways
          below `sm`, the way the rail does, and wrap above it. */}
      <nav
        aria-label="Features"
        className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0"
      >
        {FEATURES.map((feature) => (
          <a
            key={feature.nav}
            href={`#${anchor(feature.nav)}`}
            className="well shrink-0 px-2.5 py-1 text-micro uppercase text-ink-lo transition-colors hover:border-line-strong hover:text-ink-hi"
          >
            {feature.nav}
          </a>
        ))}
      </nav>

      {FEATURES.map((feature) => (
        <section
          key={feature.title}
          id={anchor(feature.nav)}
          className="flex scroll-mt-4 flex-col gap-3"
        >
          <h2 className="text-lg">{feature.title}</h2>
          <p className="text-sm text-ink-mid">{feature.blurb}</p>
          <pre className="panel p-3 text-xs leading-relaxed sm:p-4">
            <code className="font-mono">
              {extractDeclaration(feature.source, feature.extract)
                .split('\n')
                .map((line, index) => (
                  <span key={`${feature.nav}-${index}`} className="snippet-line">
                    {line}
                  </span>
                ))}
            </code>
          </pre>
        </section>
      ))}
    </div>
  )
}
