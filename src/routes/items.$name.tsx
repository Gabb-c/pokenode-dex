import { Suspense } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { itemQuery } from '@/api/queries/items'
import { cached, isNotFound } from '@/api/query-client'
import { ItemHolders } from '@/components/dex/ItemHolders'
import { ItemPrices } from '@/components/dex/ItemPrices'
import { MachineList } from '@/components/dex/MachineList'
import { DetailHeader } from '@/components/ui/DetailHeader'
import { NotFound } from '@/components/ui/NotFound'
import { Skeleton } from '@/components/ui/Skeleton'
import { cleanFlavorText, humanize } from '@/lib/format'
import { useLatestFlavor, useLocalized } from '@/hooks/use-language'

export const Route = createFileRoute('/items/$name')({
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.query(cached(itemQuery(params.name)))
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
  },
  component: ItemDetail,
  notFoundComponent: () => <UnknownItem />,
  pendingComponent: () => <Skeleton label="Loading" lines={4} />,
})

function ItemDetail() {
  const { name } = Route.useParams()
  const { data: item } = useSuspenseQuery(itemQuery(name))

  const displayName = useLocalized(item.names)?.name ?? humanize(item.name)
  const effect = useLocalized(item.effect_entries)
  const flavor = useLatestFlavor(item.flavor_text_entries)

  return (
    <article className="mx-auto flex w-full max-w-280 flex-col gap-6">
      <DetailHeader
        id={item.id}
        title={displayName}
        subtitle={<p className="text-ink-lo">{humanize(item.category.name)}</p>}
        aside={
          item.sprites.default && (
            <img
              src={item.sprites.default}
              alt=""
              width={32}
              height={32}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="size-8 [image-rendering:pixelated]"
            />
          )
        }
      />

      <div className="detail-grid">
        <div className="flex flex-col gap-4">
          <section className="panel p-4">
            <h2 className="text-micro uppercase text-ink-lo">Attributes</h2>
            {item.attributes.length === 0 ? (
              <p className="mt-3 text-sm text-ink-lo">None recorded.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {item.attributes.map((attribute) => (
                  <li
                    key={attribute.name}
                    className="well px-2.5 py-1 text-micro uppercase text-ink-mid"
                  >
                    {humanize(attribute.name)}
                  </li>
                ))}
              </ul>
            )}
            {item.fling_power !== null && (
              <p className="mt-3 border-t border-line pt-2 text-sm text-ink-mid">
                Fling <output data-numeric>{item.fling_power}</output> power
                {item.fling_effect && ` · ${humanize(item.fling_effect.name)}`}
              </p>
            )}
          </section>

          <ItemPrices item={item} />
        </div>

        <div className="flex flex-col gap-6">
          {effect && (
            <section className="panel p-4">
              <h2 className="text-micro uppercase text-ink-lo">Effect</h2>
              <p className="mt-2 max-w-[62ch] whitespace-pre-line text-ink-mid">{effect.effect}</p>
            </section>
          )}

          {flavor && (
            <div className="panel p-4">
              <p className="max-w-[62ch] text-ink-mid italic">{cleanFlavorText(flavor.text)}</p>
              <p className="mt-2 text-micro uppercase text-ink-lo">
                {humanize(flavor.version_group.name)}
              </p>
            </div>
          )}

          <Suspense fallback={<Skeleton label="Machines" />}>
            <MachineList item={item} />
          </Suspense>
          <ItemHolders item={item} />
        </div>
      </div>
    </article>
  )
}

function UnknownItem() {
  const { name } = Route.useParams()
  return (
    <NotFound eyebrow="404 · not retried" back={{ to: '/items', label: 'Back to the items' }}>
      The PokéAPI knows no item called <span className="font-mono">{name}</span>.
    </NotFound>
  )
}
