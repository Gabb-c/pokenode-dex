import { Suspense, type CSSProperties } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { pokemonQuery } from '@/api/queries/pokemon'
import { searchIndexQuery } from '@/api/queries/search-index'
import { cached } from '@/api/query-client'
import { StatDiff } from '@/components/dex/StatDiff'
import { GuessBox } from '@/components/play/GuessBox'
import { Loading } from '@/components/ui/Loading'
import { Skeleton } from '@/components/ui/Skeleton'
import { compact, optionalString } from '@/lib/search-params'

interface CompareSearch {
  /** Both absent rather than empty, so an unfilled comparison has a clean URL. */
  a?: string
  b?: string
}

export const Route = createFileRoute('/compare/')({
  validateSearch: (input: Record<string, unknown>): CompareSearch =>
    compact({ a: optionalString(input.a), b: optionalString(input.b) }),
  loader: ({ context }) => context.queryClient.query(cached(searchIndexQuery)),
  component: Compare,
  pendingComponent: () => <Loading>Walking the dex…</Loading>,
})

function Compare() {
  const { a, b } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: index } = useSuspenseQuery(searchIndexQuery)

  const pick = (side: keyof CompareSearch) => (name: string) =>
    void navigate({ search: compact({ a, b, [side]: name }), replace: true })

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl tracking-tight">Compare</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-lo">
          Two Pokémon side by side, with the difference between every stat spelled out. Both
          names live in the URL, so a comparison is a link.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <GuessBox
          index={index}
          onGuess={pick('a')}
          label="First Pokémon"
          placeholder={a ?? 'First Pokémon'}
        />
        <GuessBox
          index={index}
          onGuess={pick('b')}
          label="Second Pokémon"
          placeholder={b ?? 'Second Pokémon'}
        />
      </div>

      {a && b ? (
        <Suspense key={`${a}|${b}`} fallback={<Skeleton label="Comparison" lines={8} />}>
          <Comparison a={a} b={b} />
        </Suspense>
      ) : (
        <p className="py-16 text-center text-ink-lo">Name two Pokémon to compare them.</p>
      )}
    </div>
  )
}

/**
 * Both sides resolve here rather than in the route's loader, so replacing one
 * of them suspends the comparison and leaves the two fields on screen.
 */
function Comparison({ a, b }: { a: string; b: string }) {
  const { data: left } = useSuspenseQuery(pokemonQuery(a))
  const { data: right } = useSuspenseQuery(pokemonQuery(b))
  const style = { '--t': 'var(--accent)' } as CSSProperties

  return (
    <div style={style}>
      <StatDiff left={left} right={right} />
    </div>
  )
}
