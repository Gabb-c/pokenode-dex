import type { CSSProperties } from 'react'
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
    // A three-stage chain is ~480px against a phone's ~310, so it scrolls; the
    // containment is what keeps that swipe off the page behind it, and the
    // region gives it a name and a way in that is not a drag.
    <div
      tabIndex={0}
      role="region"
      aria-label="Evolution chain"
      className="overflow-x-auto overscroll-x-contain"
    >
      <Node link={chain} current={current} depth={0} />
    </div>
  )
}

function Node({ link, current, depth }: { link: ChainLink; current: string; depth: number }) {
  return (
    <div className="flex items-center gap-2">
      <Species link={link} current={current} depth={depth} />

      {link.evolves_to.length > 0 && (
        <ul className="flex flex-col gap-2">
          {link.evolves_to.map((next) => (
            <li key={next.species.name} className="flex items-center gap-2">
              <Edge conditions={routesInto(next)} />
              <Node link={next} current={current} depth={depth + 1} />
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

function Species({ link, current, depth }: { link: ChainLink; current: string; depth: number }) {
  const id = resourceId(link.species)
  const isCurrent = link.species.name === current

  return (
    <Link
      to="/pokemon/$name"
      params={{ name: link.species.name }}
      aria-current={isCurrent ? 'page' : undefined}
      // Depth is the stage, so a chain resolves in the order it evolves in.
      style={{ '--i': depth } as CSSProperties}
      className={`well rise-fast stagger flex w-24 shrink-0 flex-col items-center gap-0.5 p-2 transition-colors ${
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
