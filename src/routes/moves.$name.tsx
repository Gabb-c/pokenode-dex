import { Suspense, type CSSProperties } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import type { Move } from 'pokenode-ts'
import { machineQuery, moveQuery } from '@/api/queries/moves'
import { cached, isNotFound } from '@/api/query-client'
import { TypeChip } from '@/components/dex/TypeChip'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { cleanFlavorText, generationLabel, humanize } from '@/lib/format'
import { useLatestFlavor, useLocalized } from '@/lib/language'
import { typeVar } from '@/lib/types'

/** Enough to browse; the dex filter is the right tool past this. */
const LISTED = 60

export const Route = createFileRoute('/moves/$name')({
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.query(cached(moveQuery(params.name)))
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
  },
  component: MoveDetail,
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} />,
  notFoundComponent: () => <UnknownMove />,
  pendingComponent: () => <Skeleton label="Loading" lines={4} />,
})

/** The endpoint leaves the chance as a placeholder for the caller to fill. */
function withChance(effect: string, chance: number | null): string {
  return effect.replaceAll('$effect_chance', String(chance ?? 0))
}

/** A move with no power or accuracy reports `null`, and sometimes `0`. */
function figure(value: number | null): string {
  return value === null || value === 0 ? '—' : String(value)
}

function MoveDetail() {
  const { name } = Route.useParams()
  const { data: move } = useSuspenseQuery(moveQuery(name))

  const tint = typeVar(move.type.name)
  const style = { '--t': tint } as CSSProperties
  const displayName = useLocalized(move.names)?.name ?? humanize(move.name)
  // Effect text is published in English alone for most moves, so this is the
  // fallback in `useLocalized` doing its job rather than a language switch.
  const effect = useLocalized(move.effect_entries)
  const flavor = useLatestFlavor(move.flavor_text_entries)

  return (
    <article className="mx-auto flex w-full max-w-280 flex-col gap-6" style={style}>
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 border-transparent pb-2 [border-image:linear-gradient(to_right,var(--t),transparent_60%)_1]">
        <span className="text-lg text-ink-lo" data-numeric>
          {move.id}
        </span>
        <h1 className="text-3xl tracking-tight">{displayName}</h1>
        <p className="text-ink-lo">{generationLabel(move.generation.name)}</p>
        <div className="ml-auto flex items-center gap-2">
          {move.damage_class && (
            <span className="well px-2.5 py-1 text-micro uppercase text-ink-mid">
              {humanize(move.damage_class.name)}
            </span>
          )}
          <TypeChip name={move.type.name} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,48rem)]">
        <div className="flex flex-col gap-4">
          <Numbers move={move} />
          <Suspense fallback={<Skeleton label="Machine" />}>
            <Machine move={move} />
          </Suspense>
        </div>

        <div className="flex flex-col gap-6">
          {effect && (
            <section className="panel p-4">
              <h2 className="text-micro uppercase text-ink-lo">Effect</h2>
              <p className="mt-2 max-w-[62ch] text-ink-mid">
                {withChance(effect.effect, move.effect_chance)}
              </p>
            </section>
          )}

          {flavor && (
            <div className="panel p-4">
              <p className="max-w-[62ch] text-ink-mid italic">
                {cleanFlavorText(flavor.flavor_text)}
              </p>
              <p className="mt-2 text-micro uppercase text-ink-lo">
                {humanize(flavor.version_group.name)}
              </p>
            </div>
          )}

          {move.meta && <Meta move={move} />}
          <LearnedBy move={move} />
        </div>
      </div>
    </article>
  )
}

function Numbers({ move }: { move: Move }) {
  const rows = [
    ['Power', figure(move.power)],
    ['Accuracy', figure(move.accuracy)],
    ['PP', figure(move.pp)],
    ['Priority', String(move.priority)],
    ['Target', humanize(move.target.name)],
  ] as const

  return (
    <dl className="panel divide-y divide-line">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between px-4 py-2">
          <dt className="text-micro uppercase text-ink-lo">{label}</dt>
          <dd className="text-sm text-ink-hi" data-numeric={label === 'Target' ? undefined : ''}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Meta({ move }: { move: Move }) {
  const meta = move.meta
  if (!meta) return null

  const span = (min: number | null, max: number | null) =>
    min === null || max === null ? null : min === max ? String(min) : `${min}–${max}`

  const rows = [
    ['Category', humanize(meta.category.name)],
    ['Ailment', meta.ailment.name === 'none' ? null : humanize(meta.ailment.name)],
    ['Ailment chance', meta.ailment_chance > 0 ? `${meta.ailment_chance}%` : null],
    ['Flinch chance', meta.flinch_chance > 0 ? `${meta.flinch_chance}%` : null],
    ['Crit rate', meta.crit_rate > 0 ? `+${meta.crit_rate}` : null],
    // One field, two meanings: the endpoint signs recoil as negative drain.
    ['Drain', meta.drain > 0 ? `${meta.drain}%` : null],
    ['Recoil', meta.drain < 0 ? `${Math.abs(meta.drain)}%` : null],
    ['Healing', meta.healing !== 0 ? `${meta.healing}%` : null],
    ['Hits', span(meta.min_hits, meta.max_hits)],
    ['Turns', span(meta.min_turns, meta.max_turns)],
  ] as const

  const shown = rows.filter(([, value]) => value !== null)

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">In battle</h2>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {shown.map(([label, value]) => (
          <div key={label} className="col-span-2 flex items-center justify-between">
            <dt className="text-micro uppercase text-ink-lo">{label}</dt>
            <dd className="text-ink-hi">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Machine({ move }: { move: Move }) {
  const { data: machine } = useSuspenseQuery(machineQuery(move))
  if (!machine) return null

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Machine</h2>
      <p className="mt-2 text-sm text-ink-hi">
        {machine.item.name.toUpperCase()}
        <span className="ml-2 text-micro text-ink-lo">
          {humanize(machine.version_group.name)}
        </span>
      </p>
    </section>
  )
}

function LearnedBy({ move }: { move: Move }) {
  if (move.learned_by_pokemon.length === 0) return null

  return (
    <section>
      <h2 className="text-micro uppercase text-ink-lo">
        Learned by <output data-numeric>{move.learned_by_pokemon.length}</output>
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {move.learned_by_pokemon.slice(0, LISTED).map((pokemon) => (
          <li key={pokemon.name}>
            <Link
              to="/pokemon/$name"
              params={{ name: pokemon.name }}
              className="well block px-2.5 py-1 text-sm text-ink-hi hover:text-accent"
            >
              {humanize(pokemon.name)}
            </Link>
          </li>
        ))}
      </ul>
      {move.learned_by_pokemon.length > LISTED && (
        <p className="mt-3 text-sm text-ink-lo">
          The first <output data-numeric>{LISTED}</output> of{' '}
          <output data-numeric>{move.learned_by_pokemon.length}</output>.
        </p>
      )}
    </section>
  )
}

function UnknownMove() {
  const { name } = Route.useParams()
  return (
    <div className="panel mx-auto my-16 max-w-xl p-6">
      <p className="text-micro uppercase text-ink-lo">404 · not retried</p>
      <h2 className="mt-2 text-lg">
        The PokéAPI knows no move called <span className="font-mono">{name}</span>.
      </h2>
      <Link to="/moves" className="mt-5 inline-block text-sm text-accent">
        Back to the moves
      </Link>
    </div>
  )
}
