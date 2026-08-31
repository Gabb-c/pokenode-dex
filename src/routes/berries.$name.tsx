import { Suspense, type CSSProperties } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import type { NamedAPIResource, Item } from 'pokenode-ts'
import { berryQuery } from '@/api/queries/berries'
import { itemQuery } from '@/api/queries/items'
import { cached, isNotFound } from '@/api/query-client'
import { BerryFlavors } from '@/components/dex/BerryFlavors'
import { TypeChip } from '@/components/dex/TypeChip'
import { DetailHeader } from '@/components/ui/DetailHeader'
import { NotFound } from '@/components/ui/NotFound'
import { Skeleton } from '@/components/ui/Skeleton'
import { humanize } from '@/lib/format'
import { typeVar } from '@/lib/types'

export const Route = createFileRoute('/berries/$name')({
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.query(cached(berryQuery(params.name)))
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
  },
  component: BerryDetail,
  notFoundComponent: () => <UnknownBerry />,
  pendingComponent: () => <Skeleton label="Loading" lines={4} />,
})

function BerryDetail() {
  const { name } = Route.useParams()
  const { data: berry } = useSuspenseQuery(berryQuery(name))

  // The berry is tinted by the type its Natural Gift throws, which is the only
  // battle type it has any claim to.
  const style = { '--t': typeVar(berry.natural_gift_type.name) } as CSSProperties

  const rows = [
    ['Growth time', `${berry.growth_time} h/stage`],
    ['Max harvest', String(berry.max_harvest)],
    ['Size', `${berry.size / 10} cm`],
    ['Smoothness', String(berry.smoothness)],
    ['Soil dryness', String(berry.soil_dryness)],
    ['Firmness', humanize(berry.firmness.name)],
  ] as const

  return (
    <article className="mx-auto flex w-full max-w-280 flex-col gap-6" style={style}>
      <DetailHeader
        id={berry.id}
        title={humanize(berry.name)}
        subtitle={<p className="text-ink-lo">Berry</p>}
        aside={<TypeChip name={berry.natural_gift_type.name} />}
      />

      <div className="detail-grid">
        <div className="flex flex-col gap-4">
          <section className="panel p-4">
            <h2 className="text-micro uppercase text-ink-lo">Growing</h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-lo">{label}</dt>
                  <dd className="text-ink-hi" data-numeric>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="panel p-4">
            <h2 className="text-micro uppercase text-ink-lo">Natural Gift</h2>
            <p className="mt-3 text-sm text-ink-mid">
              Throws a{' '}
              <span className="text-ink-hi">{humanize(berry.natural_gift_type.name)}</span> attack
              at <output data-numeric>{berry.natural_gift_power}</output> power.
            </p>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <BerryFlavors berry={berry} />

          <section className="panel p-4">
            <h2 className="text-micro uppercase text-ink-lo">Held as an item</h2>
            {/* A berry publishes no sprite of its own — the picture belongs to
                the item it is carried as, which is one link away. */}
            <Suspense fallback={<ItemLink item={berry.item} />}>
              <BerryItem item={berry.item} />
            </Suspense>
          </section>
        </div>
      </div>
    </article>
  )
}

/** The link on its own, which is what the panel shows until the sprite lands. */
function ItemLink({ item, sprite }: { item: NamedAPIResource<Item>; sprite?: string }) {
  return (
    <p className="mt-3 flex items-center gap-2 text-sm">
      {sprite ? (
        <img
          src={sprite}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-8 shrink-0 object-contain [image-rendering:pixelated]"
        />
      ) : (
        // Held open so the link does not shift sideways when the sprite arrives.
        <span aria-hidden className="size-8 shrink-0" />
      )}
      <Link
        to="/items/$name"
        params={{ name: item.name }}
        className="text-accent hover:underline"
      >
        {humanize(item.name)}
      </Link>
    </p>
  )
}

function BerryItem({ item }: { item: NamedAPIResource<Item> }) {
  const { data: resolved } = useSuspenseQuery(itemQuery(item.name))
  return <ItemLink item={item} sprite={resolved.sprites.default} />
}

function UnknownBerry() {
  const { name } = Route.useParams()
  return (
    <NotFound eyebrow="404 · not retried" back={{ to: '/berries', label: 'Back to the berries' }}>
      The PokéAPI knows no berry called <span className="font-mono">{name}</span>.
    </NotFound>
  )
}
