import { useState, type CSSProperties } from 'react'
import { getPokemonSpriteUrl } from 'pokenode-ts'
import type { BattleEvent, Fighter, Side } from '@/lib/battle/engine'
import type { Status } from '@/lib/battle/status'
import { humanize } from '@/lib/format'

/**
 * The sets tried, in order.
 *
 * A battle wants the game sprite rather than the artwork. Both sides use the
 * front-facing one: the games only show a back sprite because they stack the
 * two diagonally, and this scene is two columns side by side at every width, so
 * a back sprite faces away from the opponent rather than towards it.
 */
function candidates(id: number): readonly string[] {
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
      <StatusBadge fighter={fighter} />

      {/* 96px is the game sprite's own size, so a phone shows it unscaled and a
          wider screen gets the enlargement. */}
      <div className="stage h-24 sm:h-40">
        {/* Front sprites face the viewer's left, so the foe in the left
            column is the one flipped, and the pair faces in. */}
        <Portrait id={fighter.id} name={fighter.name} mirrored={side === 'foe'} motion={motion} />
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
  mirrored: boolean
  motion: string
}

function Portrait({ id, name, mirrored, motion }: PortraitProps) {
  // The URLs that failed, not a flag: this component outlives a bout, so a
  // boolean would follow one Pokémon into the next.
  const [failed, setFailed] = useState<readonly string[]>([])
  const url = candidates(id).find((candidate) => !failed.includes(candidate))
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
      // The standalone `scale` property, never a transform: every one of the
      // motion classes above sets `transform`, and a mirror written as one would
      // be dropped for the length of each animation.
      style={mirrored ? { scale: '-1 1' } : undefined}
      className={`max-h-24 w-auto max-w-full object-contain [image-rendering:pixelated] sm:max-h-40 ${motion}`}
    />
  )
}

/** The abbreviations the games use, in tones the rail already carries. */
const STATUS_LABEL: Record<Status, string> = {
  burn: 'BRN',
  poison: 'PSN',
  paralysis: 'PAR',
  sleep: 'SLP',
  freeze: 'FRZ',
}

const STATUS_TONE: Record<Status, string> = {
  burn: 'text-negative',
  poison: 'text-negative',
  paralysis: 'text-caution',
  sleep: 'text-ink-lo',
  freeze: 'text-accent',
}

/**
 * The condition a fighter is under.
 *
 * The row is held open whether or not there is one, so a condition landing does
 * not shunt the sprite below it down the page mid-turn. The abbreviation is the
 * whole of the signal — the tone only follows it.
 */
function StatusBadge({ fighter }: { fighter: Fighter }) {
  return (
    <p className="h-4 text-micro uppercase">
      {fighter.status ? (
        // Keyed on the condition so a new one arrives rather than swapping in place.
        <span key={fighter.status} className={`pop ${STATUS_TONE[fighter.status]}`}>
          {STATUS_LABEL[fighter.status]}
        </span>
      ) : (
        <span className="sr-only">No condition</span>
      )}
    </p>
  )
}
