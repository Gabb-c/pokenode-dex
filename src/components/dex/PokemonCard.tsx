import { Link } from '@tanstack/react-router'
import { getPokemonSpriteUrl } from 'pokenode-ts'
import { dexNo, humanize } from '@/lib/format'

interface PokemonCardProps {
  id: number
  name: string
}

/**
 * Renders from a list link alone.
 *
 * `getPokemonSpriteUrl` builds the artwork URL from the id without a request,
 * which is what keeps a grid of a thousand cards to the handful of requests
 * that listed them.
 */
export function PokemonCard({ id, name }: PokemonCardProps) {
  return (
    <Link
      to="/pokemon/$name"
      params={{ name }}
      className="panel group flex flex-col items-center gap-1 p-3 transition-colors hover:border-line-strong"
    >
      <img
        src={getPokemonSpriteUrl(id, { variant: 'official-artwork' })}
        alt=""
        width={96}
        height={96}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="size-24 object-contain transition-transform group-hover:scale-105 motion-reduce:transition-none"
      />
      <span className="text-micro text-ink-lo" data-numeric>
        {dexNo(id)}
      </span>
      <span className="text-center text-sm text-ink-hi">{humanize(name)}</span>
    </Link>
  )
}
