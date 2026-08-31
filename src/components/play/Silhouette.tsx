import { useEffect, useEffectEvent, useState } from 'react'
import { getPokemonSpriteUrl } from 'pokenode-ts'

/**
 * The sets tried, in order.
 *
 * Official artwork has the clearest outline; a species the repository never
 * drew one for falls back to the game sprite. Written out rather than mapped
 * because `PokemonSpriteOptions` is a discriminated union — see `SpriteViewer`.
 */
function candidates(id: number): readonly string[] {
  return [
    getPokemonSpriteUrl(id, { variant: 'official-artwork' }),
    getPokemonSpriteUrl(id, { variant: 'default' }),
  ]
}

interface SilhouetteProps {
  id: number
  name: string
  /** Null while the round is open, which is what keeps the artwork punched out. */
  verdict: 'correct' | 'wrong' | null
  /** The next round's Pokémon, whose artwork is fetched while this one is up. */
  upcomingId: number | undefined
  /** Neither set has an image for this id, so the round is unanswerable. */
  onExhausted: () => void
}

export function Silhouette({ id, name, verdict, upcomingId, onExhausted }: SilhouetteProps) {
  // The URLs that failed, not a flag: this component stays mounted from one
  // round to the next, so a boolean would follow one Pokémon into the other.
  const [failed, setFailed] = useState<readonly string[]>([])
  const url = candidates(id).find((candidate) => !failed.includes(candidate))
  const exhausted = useEffectEvent(onExhausted)

  useEffect(() => {
    if (!url) exhausted()
  }, [url])

  useEffect(() => {
    if (upcomingId === undefined) return
    // Warms the browser's image cache only; the sprite repository is not the API.
    const [artwork] = candidates(upcomingId)
    new Image().src = artwork
  }, [upcomingId])

  return (
    <div className="stage h-64">
      {url && (
        <>
          {verdict === 'correct' && <span aria-hidden className="art-bloom" />}
          <img
            key={url}
            src={url}
            alt={verdict ? name : 'The silhouette to identify'}
            width={475}
            height={475}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed((current) => [...current, url])}
            className={`max-h-64 w-auto max-w-full object-contain ${verdict ? '' : 'silhouette'} ${
              verdict === 'wrong' ? 'art-shake' : 'art-in'
            }`}
          />
        </>
      )}
    </div>
  )
}
