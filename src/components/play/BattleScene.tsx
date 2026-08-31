import { useState, type CSSProperties } from 'react'
import { getPokemonSpriteUrl } from 'pokenode-ts'
import type { BattleEvent, Fighter, Side } from '@/lib/battle'
import { humanize } from '@/lib/format'

/**
 * The sets tried, in order.
 *
 * A battle wants the game sprite rather than the artwork — it is the only set
 * drawn from behind. Written out rather than mapped because
 * `PokemonSpriteOptions` is a discriminated union; see `SpriteViewer`.
 */
function candidates(id: number, back: boolean): readonly string[] {
  if (back) {
    return [
      getPokemonSpriteUrl(id, { variant: 'default', back: true }),
      getPokemonSpriteUrl(id, { variant: 'default' }),
    ]
  }
  return [
    getPokemonSpriteUrl(id, { variant: 'default' }),
    getPokemonSpriteUrl(id, { variant: 'official-artwork' }),
  ]
}

interface BattleSceneProps {
  player: Fighter
  foe: Fighter
  /** The event on screen right now, which decides who moves. */
  event: BattleEvent | undefined
  /**
   * Where that event sits in the turn. Two rules run identical keyframes and
   * this picks between them, so an event that repeats replays without the
   * sprite being remounted — the same trick `useRouteEnter` uses.
   */
  beat: number
}

/**
 * Two columns at every width.
 *
 * Stacking them on a phone put the scene at 500px in a 610px window, which left
 * the move menu below the fold — the player scrolled down to attack and back up
 * to watch it land. Side by side the pair is a third of that, and the turn and
 * the choice are on screen together.
 */
export function BattleScene({ player, foe, event, beat }: BattleSceneProps) {
  return (
    <div className="panel grid grid-cols-2 gap-3 p-3 sm:gap-6 sm:p-4">
      <Combatant fighter={foe} side="foe" event={event} beat={beat} />
      <Combatant fighter={player} side="player" event={event} beat={beat} />
    </div>
  )
}

interface CombatantProps {
  fighter: Fighter
  side: Side
  event: BattleEvent | undefined
  beat: number
}

function Combatant({ fighter, side, event, beat }: CombatantProps) {
  const attacking = event?.kind === 'use' && event.side === side
  const struck = event?.kind === 'hit' && event.side !== side
  const down = fighter.hp === 0

  const motion = down
    ? 'battle-faint'
    : attacking
      ? beat % 2 === 0
        ? 'lunge-a'
        : 'lunge-b'
      : struck
        ? 'art-shake'
        : ''

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        {/* A column is half a phone wide, and Crabominable has to fit in it. */}
        <h2 className="truncate text-base sm:text-lg">{humanize(fighter.name)}</h2>
        <span className="shrink-0 text-micro uppercase text-ink-lo">
          Lv <output data-numeric>{fighter.level}</output>
        </span>
      </div>

      <HealthBar fighter={fighter} />

      {/* 96px is the game sprite's own size, so a phone shows it unscaled and a
          wider screen gets the enlargement. */}
      <div className="stage h-24 sm:h-40">
        <Portrait id={fighter.id} name={fighter.name} back={side === 'player'} motion={motion} />
      </div>
    </div>
  )
}

function HealthBar({ fighter }: { fighter: Fighter }) {
  const ratio = fighter.hp / fighter.stats.hp
  // Three readings, and the number beside the bar says the same thing without
  // relying on the colour.
  const tone = ratio > 0.5 ? 'var(--positive)' : ratio > 0.2 ? 'var(--caution)' : 'var(--negative)'
  const style = { '--t': tone, '--fill': `${ratio * 100}%` } as CSSProperties

  return (
    <div
      className="grid grid-cols-[1fr_3.25rem] items-center gap-2 sm:grid-cols-[1fr_4.5rem] sm:gap-3"
      style={style}
    >
      <div
        role="meter"
        aria-label={`${humanize(fighter.name)} HP`}
        aria-valuenow={fighter.hp}
        aria-valuemin={0}
        aria-valuemax={fighter.stats.hp}
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="hp-fill h-full rounded-full bg-[var(--t)]" style={{ width: 'var(--fill)' }} />
      </div>
      <output className="text-right text-micro text-ink-hi sm:text-sm">
        {fighter.hp}/{fighter.stats.hp}
      </output>
    </div>
  )
}

interface PortraitProps {
  id: number
  name: string
  back: boolean
  motion: string
}

function Portrait({ id, name, back, motion }: PortraitProps) {
  // The URLs that failed, not a flag: this component outlives a bout, so a
  // boolean would follow one Pokémon into the next.
  const [failed, setFailed] = useState<readonly string[]>([])
  const url = candidates(id, back).find((candidate) => !failed.includes(candidate))
  if (!url) return null

  return (
    <img
      src={url}
      alt={humanize(name)}
      width={96}
      height={96}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed((current) => [...current, url])}
      className={`max-h-24 w-auto max-w-full object-contain [image-rendering:pixelated] sm:max-h-40 ${motion}`}
    />
  )
}
