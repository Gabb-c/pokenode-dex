import { Link } from '@tanstack/react-router'
import {
  formatRequirements,
  getPokemonSpriteUrl,
  requirementsOf,
  resourceId,
  type ChainLink,
} from 'pokenode-ts'
import { dexNo, humanize, tidyTrigger } from '@/lib/format'

/**
 * The chain as the directed graph it is.
 *
 * Laid out by recursion rather than by measuring: each node sits beside a column
 * of the nodes it evolves into, so a branch like Eevee's eight fans out without
 * any coordinate maths.
 */
export function EvolutionGraph({ chain, current }: { chain: ChainLink; current: string }) {
  if (chain.evolves_to.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <Node link={chain} current={current} />
    </div>
  )
}

function Node({ link, current }: { link: ChainLink; current: string }) {
  return (
    <div className="flex items-center gap-2">
      <Species link={link} current={current} />

      {link.evolves_to.length > 0 && (
        <ul className="flex flex-col gap-2">
          {link.evolves_to.map((next) => (
            <li key={next.species.name} className="flex items-center gap-2">
              <Edge conditions={routesInto(next)} />
              <Node link={next} current={current} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The alternative routes into this species — the API publishes one detail per
 * version group, so a species reached two ways carries two of them.
 */
const routesInto = (link: ChainLink) =>
  link.evolution_details.map((detail) => tidyTrigger(formatRequirements(requirementsOf(detail))))

function Edge({ conditions }: { conditions: string[] }) {
  return (
    <div className="flex min-w-24 flex-col items-center gap-0.5 px-1">
      <span className="text-center text-micro leading-tight text-ink-lo">
        {conditions.join(' / ') || '—'}
      </span>
      <span aria-hidden className="flex w-full items-center text-ink-lo">
        <span className="h-px flex-1 bg-line-strong" />
        <span className="-ml-1 text-[0.6rem]">▶</span>
      </span>
    </div>
  )
}

function Species({ link, current }: { link: ChainLink; current: string }) {
  const id = resourceId(link.species)
  const isCurrent = link.species.name === current

  return (
    <Link
      to="/pokemon/$name"
      params={{ name: link.species.name }}
      aria-current={isCurrent ? 'page' : undefined}
      className={`well flex w-24 shrink-0 flex-col items-center gap-0.5 p-2 transition-colors ${
        isCurrent ? 'border-accent text-accent' : 'text-ink-hi hover:border-line-strong'
      }`}
    >
      <img
        src={getPokemonSpriteUrl(id)}
        alt=""
        width={56}
        height={56}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="size-14"
      />
      <span className="text-micro text-ink-lo" data-numeric>
        {dexNo(id)}
      </span>
      <span className="text-center text-xs leading-tight">{humanize(link.species.name)}</span>
    </Link>
  )
}
