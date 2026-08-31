import { Suspense, type CSSProperties } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { moveQuery } from '@/api/queries/moves'
import { cached, isNotFound } from '@/api/query-client'
import { LearnedBy } from '@/components/dex/LearnedBy'
import { MoveMachine } from '@/components/dex/MoveMachine'
import { MoveMeta } from '@/components/dex/MoveMeta'
import { MoveNumbers } from '@/components/dex/MoveNumbers'
import { TypeChip } from '@/components/dex/TypeChip'
import { DetailHeader } from '@/components/ui/DetailHeader'
import { NotFound } from '@/components/ui/NotFound'
import { Skeleton } from '@/components/ui/Skeleton'
import { cleanFlavorText, generationLabel, humanize } from '@/lib/format'
import { useLatestFlavor, useLocalized } from '@/hooks/use-language'
import { typeVar } from '@/lib/types'

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
  notFoundComponent: () => <UnknownMove />,
  pendingComponent: () => <Skeleton label="Loading" lines={4} />,
})

/** The endpoint leaves the chance as a placeholder for the caller to fill. */
function withChance(effect: string, chance: number | null): string {
  return effect.replaceAll('$effect_chance', String(chance ?? 0))
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
      <DetailHeader
        id={move.id}
        title={displayName}
        subtitle={<p className="text-ink-lo">{generationLabel(move.generation.name)}</p>}
        aside={
          <>
            {move.damage_class && (
              <span className="well px-2.5 py-1 text-micro uppercase text-ink-mid">
                {humanize(move.damage_class.name)}
              </span>
            )}
            <TypeChip name={move.type.name} />
          </>
        }
      />

      <div className="detail-grid">
        <div className="flex flex-col gap-4">
          <MoveNumbers move={move} />
          <Suspense fallback={<Skeleton label="Machine" />}>
            <MoveMachine move={move} />
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

          <MoveMeta move={move} />
          <LearnedBy move={move} />
        </div>
      </div>
    </article>
  )
}

function UnknownMove() {
  const { name } = Route.useParams()
  return (
    <NotFound eyebrow="404 · not retried" back={{ to: '/moves', label: 'Back to the moves' }}>
      The PokéAPI knows no move called <span className="font-mono">{name}</span>.
    </NotFound>
  )
}
