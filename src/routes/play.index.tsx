import { Link, createFileRoute } from '@tanstack/react-router'
import { searchIndexQuery } from '@/api/queries/search-index'
import { cached } from '@/api/query-client'
import { ErrorState } from '@/components/ui/ErrorState'
import { readBestStreak } from '@/lib/best-streak'

export const Route = createFileRoute('/play/')({
  // The pool every mode draws from, walked while the hub is being read.
  loader: ({ context }) => context.queryClient.query(cached(searchIndexQuery)),
  component: PlayIndex,
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} />,
})

function PlayIndex() {
  const best = readBestStreak()

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl tracking-tight">Play</h1>
        <p className="mt-1 text-sm text-ink-lo">
          The dex, from the other side. Every round is drawn from the index already in
          memory and the artwork costs no request, so the rail below should stay quiet.
        </p>
      </header>

      <Link
        to="/play/silhouette"
        className="panel flex max-w-md flex-col gap-1 p-4 transition-colors hover:border-line-strong"
      >
        <h2 className="text-lg">Who&rsquo;s that Pokémon?</h2>
        <p className="text-sm text-ink-mid">
          A silhouette, a name and three lives. Type the answer; the streak ends when the
          lives do.
        </p>
        {best > 0 && (
          <p className="text-micro uppercase text-ink-lo">
            Best streak <output data-numeric>{best}</output>
          </p>
        )}
      </Link>
    </section>
  )
}
