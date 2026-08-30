import { useState, type CSSProperties } from 'react'
import { getPokemonSpriteUrl, type SpriteVariant } from 'pokenode-ts'

interface Facets {
  shiny: boolean
  back: boolean
  female: boolean
}

/**
 * Which facets each sprite set actually publishes.
 *
 * This mirrors the `PokemonSpriteOptions` union: only `default` and `showdown`
 * have back-facing sprites, `official-artwork` has no gendered ones, and
 * `dream-world` has no shiny. Controls the set cannot answer are disabled
 * rather than hidden, so the constraint is legible instead of mysterious.
 */
const SETS: Record<SpriteVariant, Facets> = {
  default: { shiny: true, back: true, female: true },
  showdown: { shiny: true, back: true, female: true },
  home: { shiny: true, back: false, female: true },
  'official-artwork': { shiny: true, back: false, female: false },
  'dream-world': { shiny: false, back: false, female: true },
}

const VARIANTS = Object.keys(SETS) as SpriteVariant[]
const FACETS = ['shiny', 'back', 'female'] as const

/**
 * Builds the URL for one set.
 *
 * Written as a switch rather than one spread call because the options type is a
 * discriminated union — passing `back` alongside `variant: 'home'` is a type
 * error, and rightly so.
 */
function spriteUrl(id: number, variant: SpriteVariant, facets: Facets): string {
  const { shiny, back, female } = facets
  switch (variant) {
    case 'default':
      return getPokemonSpriteUrl(id, { variant, shiny, back, female })
    case 'showdown':
      return getPokemonSpriteUrl(id, { variant, shiny, back, female })
    case 'home':
      return getPokemonSpriteUrl(id, { variant, shiny, female })
    case 'official-artwork':
      return getPokemonSpriteUrl(id, { variant, shiny })
    case 'dream-world':
      return getPokemonSpriteUrl(id, { variant, female })
  }
}

interface SpriteViewerProps {
  id: number
  name: string
  /** The Pokémon's primary type, so the frame belongs to the specimen inside it. */
  tint: string
}

export function SpriteViewer({ id, name, tint }: SpriteViewerProps) {
  const [variant, setVariant] = useState<SpriteVariant>('official-artwork')
  const [facets, setFacets] = useState<Facets>({ shiny: false, back: false, female: false })
  // The URL that failed, not a bare flag: the route keeps this component mounted
  // across a change of `id`, so a boolean would follow one Pokémon to the next.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  const supported = SETS[variant]
  // A facet the set does not publish must not reach the URL builder.
  const effective: Facets = {
    shiny: supported.shiny && facets.shiny,
    back: supported.back && facets.back,
    female: supported.female && facets.female,
  }
  const url = spriteUrl(id, variant, effective)
  const missing = failedUrl === url

  return (
    <div
      className="panel flex flex-col gap-3 border-[color-mix(in_oklch,var(--t)_35%,var(--line))] p-4"
      style={{ '--t': tint } as CSSProperties}
    >
      <div className="grid h-56 place-items-center">
        {missing ? (
          <p className="fade-in text-center text-micro text-ink-lo">
            The sprite repository has no image for this combination.
          </p>
        ) : (
          <img
            key={url}
            src={url}
            alt={name}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailedUrl(url)}
            className="fade-in max-h-56 max-w-full object-contain"
          />
        )}
      </div>

      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Sprite set">
        {VARIANTS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={variant === option}
            onClick={() => setVariant(option)}
            className={`rounded-[3px] px-2 py-0.5 text-micro transition-colors ${
              variant === option ? 'bg-accent text-accent-ink' : 'well text-ink-lo hover:text-ink-hi'
            }`}
          >
            {option.replace(/-/g, ' ')}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {FACETS.map((facet) => (
          <label
            key={facet}
            className={`flex items-center gap-1.5 text-micro uppercase ${
              supported[facet] ? 'text-ink-mid' : 'cursor-not-allowed text-ink-lo opacity-50'
            }`}
            title={supported[facet] ? undefined : `The ${variant} set has no ${facet} sprites`}
          >
            <input
              type="checkbox"
              checked={effective[facet]}
              disabled={!supported[facet]}
              onChange={(event) =>
                setFacets((current) => ({ ...current, [facet]: event.target.checked }))
              }
            />
            {facet}
          </label>
        ))}
      </div>
    </div>
  )
}
