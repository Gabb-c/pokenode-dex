import { useRef, useState } from 'react'
import type { Pokemon } from 'pokenode-ts'

type Take = 'latest' | 'legacy'

/**
 * The cry the games play, as the API publishes it.
 *
 * `preload="none"`: a dex page is scrolled past far more often than it is
 * listened to, and the audio is a request the reader did not ask for until they
 * press the button.
 *
 * The type says both takes are strings, but the endpoint sends `null` for
 * `legacy` on anything introduced after the games that had one — so it is
 * checked rather than trusted.
 */
export function Cries({ pokemon }: { pokemon: Pokemon }) {
  const takes = (['latest', 'legacy'] as const).filter((take) => Boolean(pokemon.cries[take]))
  const [playing, setPlaying] = useState<Take | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  if (takes.length === 0) return null

  function play(take: Take) {
    const audio = audioRef.current
    if (!audio) return
    audio.src = pokemon.cries[take]
    setPlaying(take)
    // A browser may refuse to play without a gesture it recognises; the button
    // going quiet again is the whole of the failure the reader needs.
    void audio.play().catch(() => setPlaying(null))
  }

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Cry</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {takes.map((take) => (
          <button
            key={take}
            type="button"
            onClick={() => play(take)}
            className={`btn px-3 py-1 text-sm transition-colors hover:border-line-strong ${
              playing === take ? 'text-accent' : 'text-ink-mid'
            }`}
          >
            {take === 'latest' ? 'Play' : 'Play the old one'}
          </button>
        ))}
      </div>
      <audio ref={audioRef} preload="none" onEnded={() => setPlaying(null)} />
    </section>
  )
}
