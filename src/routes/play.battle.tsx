import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { battleMovesQuery } from '@/api/queries/battle'
import { pokemonQuery } from '@/api/queries/pokemon'
import { searchIndexQuery, type DexEntry } from '@/api/queries/search-index'
import { matchupsQuery } from '@/api/queries/types'
import { cached } from '@/api/query-client'
import { BattleScene } from '@/components/play/BattleScene'
import { GuessBox } from '@/components/play/GuessBox'
import { MoveMenu } from '@/components/play/MoveMenu'
import { Loading } from '@/components/ui/Loading'
import {
  fighterFrom,
  openBattle,
  resolveTurn,
  type BattleEvent,
  type BattleState,
  type Side,
} from '@/lib/battle/engine'
import { battleWins } from '@/lib/records'
import { humanize } from '@/lib/format'
import { pickAnswer, playablePool } from '@/lib/dex/silhouette'
import { compact, optionalString } from '@/lib/search-params'

interface BattleSearch {
  /** Absent until a Pokémon is chosen, so the picker has a clean URL. */
  me?: string
}

export const Route = createFileRoute('/play/battle')({
  validateSearch: (input: Record<string, unknown>): BattleSearch =>
    compact({ me: optionalString(input.me) }),
  loader: ({ context }) => context.queryClient.query(cached(searchIndexQuery)),
  component: BattleGame,
  pendingComponent: () => <Loading>Walking the dex…</Loading>,
})

/** Both sides, so a duel is a matter of the Pokémon rather than the training. */
const LEVEL = 50

/**
 * How long one line of the turn stays up.
 *
 * Reading time, not decoration, so it is deliberately not reduced along with
 * the animations — the engine owns this clock and the battle advances on it
 * whether or not a single sprite moves.
 */
const BEAT = 1100

function BattleGame() {
  const { me } = Route.useSearch()
  const { data: index } = useSuspenseQuery(searchIndexQuery)
  const pool = useMemo(() => playablePool(index), [index])

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl tracking-tight">Battle</h1>
        {/* Five lines on a phone, and once a duel is on it is five lines of
            explanation sitting between the reader and the fight. */}
        <p className={`mt-1 text-sm text-ink-lo ${me ? 'hidden sm:block' : ''}`}>
          One Pokémon each at level {LEVEL}, four moves off the real level-up learnset, and the
          damage formula the games have used since Ruby. Pick a side; the opponent is drawn from
          the dex.
        </p>
      </header>

      {me ? <Duel key={me} me={me} pool={pool} /> : <Picker index={index} />}
    </section>
  )
}

function Picker({ index }: { index: readonly DexEntry[] }) {
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <div className="panel flex flex-col gap-3 p-4">
      <h2 className="text-lg">Who are you sending out?</h2>
      <GuessBox
        index={index}
        label="Choose your Pokémon"
        placeholder="Search the dex"
        onGuess={(name) => void navigate({ search: { me: name } })}
      />
    </div>
  )
}

/**
 * Holds the opponent, so a rematch redraws one without disturbing the choice
 * of Pokémon sitting in the URL.
 */
function Duel({ me, pool }: { me: string; pool: readonly DexEntry[] }) {
  const mine = pool.find((entry) => entry.name === me)
  const [foe, setFoe] = useState(() => pickAnswer(pool, new Set(mine ? [mine.id] : [])))
  const [bout, setBout] = useState(0)

  if (!foe) return <p className="py-16 text-center text-ink-lo">No Pokémon to battle.</p>

  return (
    // A boundary of its own, or the next bout's queries would suspend the whole
    // route and take the header down with them on every rematch. Keyed on the
    // bout rather than the opponent: a small pool can redraw the Pokémon that is
    // already out, and that still has to start a fresh battle.
    <Suspense fallback={<Loading>Sending them out…</Loading>}>
      <Bout
        key={bout}
        me={me}
        foe={foe.name}
        onRematch={() => {
          setFoe(pickAnswer(pool, new Set([foe.id, ...(mine ? [mine.id] : [])])) ?? foe)
          setBout((count) => count + 1)
        }}
      />
    </Suspense>
  )
}

interface Round {
  /** What the turn started from. The scene is drawn from this while it replays. */
  state: BattleState
  /** Where the turn ended, adopted once its last event has landed. */
  pending: BattleState | null
  events: readonly BattleEvent[]
  /** How many events have landed. */
  step: number
}

/**
 * The damage taken so far this turn.
 *
 * The engine hands back the end of the turn in one piece, so the HP bars have
 * to be walked forward event by event or they would empty before the first
 * message was read.
 */
function shownAt(state: BattleState, events: readonly BattleEvent[], step: number) {
  let player = state.player
  let foe = state.foe

  for (const event of events.slice(0, step)) {
    if (event.kind !== 'hit') continue
    if (event.side === 'player') foe = { ...foe, hp: Math.max(0, foe.hp - event.damage) }
    else player = { ...player, hp: Math.max(0, player.hp - event.damage) }
  }

  return { player, foe }
}

function describe(event: BattleEvent, names: Record<Side, string>): string {
  switch (event.kind) {
    case 'use':
      return `${names[event.side]} used ${humanize(event.move)}!`
    case 'miss':
      return `${names[event.side]}'s attack missed!`
    case 'hit': {
      const target = names[event.side === 'player' ? 'foe' : 'player']
      if (event.effectiveness === 0) return `It doesn't affect ${target}…`
      const note = event.critical ? 'A critical hit! ' : ''
      const reading =
        event.effectiveness > 1
          ? "It's super effective! "
          : event.effectiveness < 1
            ? "It's not very effective… "
            : ''
      return `${note}${reading}${target} lost ${event.damage} HP.`
    }
    case 'faint':
      return `${names[event.side]} fainted!`
  }
}

interface BoutProps {
  me: string
  foe: string
  onRematch: () => void
}

function Bout({ me, foe, onRematch }: BoutProps) {
  // Two waves rather than six: the sides are independent of each other, and a
  // chain of `useSuspenseQuery` would fetch the foe only once the player had
  // landed. The second wave needs the payload the first brings back.
  const [{ data: minePokemon }, { data: foePokemon }] = useSuspenseQueries({
    queries: [pokemonQuery(me), pokemonQuery(foe)],
  })
  const [{ data: mineChart }, { data: foeChart }, { data: mineMoves }, { data: foeMoves }] =
    useSuspenseQueries({
      queries: [
        matchupsQuery(minePokemon),
        matchupsQuery(foePokemon),
        battleMovesQuery(minePokemon, LEVEL),
        battleMovesQuery(foePokemon, LEVEL),
      ],
    })

  const [round, setRound] = useState<Round>(() => ({
    state: openBattle(
      fighterFrom(minePokemon, mineMoves, mineChart, LEVEL),
      fighterFrom(foePokemon, foeMoves, foeChart, LEVEL),
    ),
    pending: null,
    events: [],
    step: 0,
  }))
  const [wins, setWins] = useState(battleWins.read)
  const recorded = useRef(false)

  const playing = round.step < round.events.length
  const outcome = round.pending ? null : round.state.outcome

  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => setRound((current) => ({ ...current, step: current.step + 1 })), BEAT)
    return () => clearTimeout(timer)
  }, [playing, round.step])

  // Banked once the turn has finished replaying, never when the move is picked:
  // a counter that moves early reads the result out before the text does. The
  // latch is per bout, which is one battle, so it cannot count twice.
  useEffect(() => {
    if (outcome !== 'won' || recorded.current) return
    recorded.current = true
    const total = wins + 1
    setWins(total)
    battleWins.save(total)
  }, [outcome, wins])

  // Adjusting state during render rather than in an effect: the turn's result
  // has to be on the board in the same commit its last message lands in, or the
  // bars sit a frame behind the text. Clearing `pending` is what stops it
  // running twice.
  if (round.pending && !playing) {
    setRound({ ...round, state: round.pending, pending: null })
  }

  const names: Record<Side, string> = {
    player: humanize(round.state.player.name),
    foe: humanize(round.state.foe.name),
  }
  const view = round.pending
    ? shownAt(round.state, round.events, round.step)
    : { player: round.state.player, foe: round.state.foe }

  const current = round.step > 0 ? round.events[round.step - 1] : undefined
  const message = current ? describe(current, names) : `What will ${names.player} do?`

  function act(index: number) {
    if (playing || round.state.outcome) return
    const { next, events } = resolveTurn(round.state, index)
    setRound({ state: round.state, pending: next, events, step: events.length > 0 ? 1 : 0 })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-micro uppercase text-ink-lo">
        <span>
          Turn <output data-numeric>{round.state.turn}</output>
        </span>
        {wins > 0 && (
          <span>
            Wins <output data-numeric>{wins}</output>
          </span>
        )}
      </div>

      <BattleScene player={view.player} foe={view.foe} event={current} beat={round.step} />

      {/* Keyed on the position in the turn rather than the text: two turns
          running can read identically, and a key that did not change would
          leave the line sitting there without replaying. */}
      <p className="well px-3 py-2 text-sm text-ink-hi">
        <span key={`${round.state.turn}-${round.step}`} className="fade-in inline-block">
          {message}
        </span>
      </p>

      {/* The turn is spoken, never left to the bars alone. */}
      <p role="status" className="sr-only">
        {current ? message : ''}
      </p>

      {outcome ? (
        <Outcome outcome={outcome} me={me} onRematch={onRematch} />
      ) : (
        <MoveMenu moves={round.state.player.moves} busy={playing} onPick={act} />
      )}
    </div>
  )
}

function Outcome({
  outcome,
  me,
  onRematch,
}: {
  outcome: 'won' | 'lost'
  me: string
  onRematch: () => void
}) {
  return (
    <div className="panel flex flex-wrap items-center gap-3 p-4">
      <p className="flex-1 text-sm text-ink-hi">
        {outcome === 'won'
          ? `${humanize(me)} won the battle.`
          : `${humanize(me)} fainted. The battle is lost.`}
      </p>
      <button
        type="button"
        autoFocus
        onClick={onRematch}
        className="btn-accent px-3 py-1 text-micro uppercase"
      >
        Another opponent
      </button>
      <Link
        to="/play/battle"
        search={{}}
        className="btn px-3 py-1 text-micro uppercase text-ink-mid"
      >
        Change Pokémon
      </Link>
    </div>
  )
}
