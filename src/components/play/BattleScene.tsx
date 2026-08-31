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

export function BattleScene({ player, foe, event, beat }: BattleSceneProps) {
  return (
    <div className="panel grid gap-6 p-4 sm:grid-cols-2">
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
    <div className={`flex flex-col gap-2 ${side === 'player' ? 'sm:order-2' : ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg">{humanize(fighter.name)}</h2>
        <span className="text-micro uppercase text-ink-lo">
          Lv <output data-numeric>{fighter.level}</output>
        </span>
      </div>

      <HealthBar fighter={fighter} />

      <div className="stage h-40">
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
    <div className="grid grid-cols-[1fr_4.5rem] items-center gap-3" style={style}>
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
      <output className="text-right text-sm text-ink-hi">
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
      className={`max-h-40 w-auto max-w-full object-contain [image-rendering:pixelated] ${motion}`}
    />
  )
}
