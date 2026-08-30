import { useMemo, useState } from 'react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import type { GenerationName } from 'pokenode-ts'
import { generationMembersQuery } from '@/api/queries/games'
import { pokemonQuery } from '@/api/queries/pokemon'
import { searchIndexQuery, type DexEntry } from '@/api/queries/search-index'
import { cached } from '@/api/query-client'
import { TypeChip } from '@/components/dex/TypeChip'
import { GuessBox } from '@/components/play/GuessBox'
import { Silhouette } from '@/components/play/Silhouette'
import { ErrorState } from '@/components/ui/ErrorState'
import { readBestStreak, saveBestStreak } from '@/lib/best-streak'
import { dexNo, generationLabel, humanize } from '@/lib/format'
import { GENERATION_NAMES, isGenerationName } from '@/lib/generation'
import { isCorrectGuess, pickAnswer, playablePool } from '@/lib/silhouette'

interface PlaySearch {
  /** Absent for the whole dex, so the default game has a clean URL. */
  gen?: GenerationName
}

export const Route = createFileRoute('/play/silhouette')({
  validateSearch: (input: Record<string, unknown>): PlaySearch => {
    const gen = typeof input.gen === 'string' && isGenerationName(input.gen) ? input.gen : undefined
    return gen ? { gen } : {}
  },
  loader: ({ context }) => context.queryClient.query(cached(searchIndexQuery)),
  component: SilhouetteGame,
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} />,
  pendingComponent: () => <p className="py-16 text-center text-ink-lo">Walking the dex…</p>,
})

const LIVES = 3

interface Run {
  answer: DexEntry | undefined
  /** Drawn a round early, so its artwork is in the browser before it is needed. */
  upcoming: DexEntry | undefined
  seen: ReadonlySet<number>
  lives: number
  streak: number
  /** Null while the round is still open. */
  verdict: 'correct' | 'wrong' | null
}

function start(pool: readonly DexEntry[]): Run {
  const answer = pickAnswer(pool, new Set())
  const seen = answer ? new Set([answer.id]) : new Set<number>()
  return {
    answer,
    upcoming: pickAnswer(pool, seen),
    seen,
    lives: LIVES,
    streak: 0,
    verdict: null,
  }
}

function SilhouetteGame() {
  const { gen } = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data: index } = useSuspenseQuery(searchIndexQuery)
  // The scoping set, only once a generation is chosen. The key while none is
  // stays distinct from every real generation, and never fetches.
  const { data: members } = useQuery({
    ...generationMembersQuery(gen ?? ''),
    enabled: gen !== undefined,
  })

  const pool = useMemo(() => playablePool(index, members), [index, members])
  const scoping = gen !== undefined && members === undefined

  const [run, setRun] = useState<Run>(() => start(pool))
  const [best, setBest] = useState(readBestStreak)
  // Restarts whenever the pool itself changes — a new generation is a new run,
  // and so is the moment its membership finally lands.
  const [lastPool, setLastPool] = useState(pool)
  if (lastPool !== pool) {
    setLastPool(pool)
    setRun(start(pool))
  }

  // The last life still gets its reveal: the run ends on the way out of that
  // round, not the moment the life is spent.
  const over = run.lives === 0 && run.verdict === null

  function guess(name: string) {
    const { answer } = run
    if (!answer || run.verdict) return

    const correct = isCorrectGuess(name, answer)
    const streak = correct ? run.streak + 1 : run.streak
    if (streak > best) {
      setBest(streak)
      saveBestStreak(streak)
    }

    setRun({
      ...run,
      verdict: correct ? 'correct' : 'wrong',
      streak,
      lives: correct ? run.lives : run.lives - 1,
    })
  }

  function advance() {
    const answer = run.upcoming
    if (!answer) return
    const seen = new Set(run.seen).add(answer.id)
    setRun({ ...run, answer, upcoming: pickAnswer(pool, seen), seen, verdict: null })
  }

  /** A round whose artwork the sprite repository does not have is not a round. */
  function reroll() {
    if (run.verdict) return
    advance()
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4">
      <header className="flex w-full flex-wrap items-center gap-x-6 gap-y-2">
        <h1 className="text-2xl tracking-tight">Who&rsquo;s that Pokémon?</h1>

        <label className="flex items-center gap-2 text-micro uppercase text-ink-lo">
          Generation
          <select
            value={gen ?? ''}
            onChange={(event) => {
              const next = event.target.value
              void navigate({ search: isGenerationName(next) ? { gen: next } : {} })
            }}
            className="well cursor-pointer px-2 py-1 text-sm text-ink-mid"
          >
            <option value="">any</option>
            {GENERATION_NAMES.map((name) => (
              <option key={name} value={name}>
                {generationLabel(name)}
              </option>
            ))}
          </select>
        </label>

        <p className="ml-auto flex items-center gap-4 text-micro uppercase text-ink-lo">
          <span>
            Streak{' '}
            {/* Keyed on the count so each increment restarts the pop. */}
            <output key={run.streak} data-numeric className={run.streak > 0 ? 'pop' : undefined}>
              {run.streak}
            </output>
          </span>
          <span>
            Best <output data-numeric>{best}</output>
          </span>
          <span className="flex items-center gap-2">
            Lives
            <span aria-hidden className="flex gap-1">
              {Array.from({ length: LIVES }, (_, life) => (
                <span key={life} className={`pip ${life < run.lives ? '' : 'pip-spent'}`} />
              ))}
            </span>
            <output className="sr-only" data-numeric>
              {run.lives}/{LIVES}
            </output>
          </span>
        </p>
      </header>

      {scoping ? (
        <p className="py-16 text-ink-lo">Narrowing to {generationLabel(gen)}…</p>
      ) : !run.answer ? (
        <p className="py-16 text-ink-lo">No Pokémon in this scope.</p>
      ) : over ? (
        <GameOver streak={run.streak} best={best} onRestart={() => setRun(start(pool))} />
      ) : (
        <>
          <Silhouette
            id={run.answer.id}
            name={humanize(run.answer.name)}
            verdict={run.verdict}
            upcomingId={run.upcoming?.id}
            onExhausted={reroll}
          />

          {run.verdict ? (
            <Reveal answer={run.answer} correct={run.verdict === 'correct'} onNext={advance} />
          ) : (
            <GuessBox index={index} onGuess={guess} />
          )}
        </>
      )}

      {/* The verdict is spoken, never left to the picture alone. */}
      <p role="status" className="sr-only">
        {run.verdict && run.answer
          ? `${run.verdict === 'correct' ? 'Correct' : 'Wrong'} — ${humanize(run.answer.name)}`
          : ''}
      </p>
    </section>
  )
}

interface RevealProps {
  answer: DexEntry
  correct: boolean
  onNext: () => void
}

function Reveal({ answer, correct, onNext }: RevealProps) {
  // Mounted only once the answer is out, and never blocking: the types arrive
  // when they arrive, and the next round does not wait for them.
  const { data: pokemon } = useQuery(pokemonQuery(answer.name))

  return (
    <div className="panel rise flex w-full max-w-sm flex-col items-center gap-3 p-4">
      <p className={`text-micro uppercase ${correct ? 'text-positive' : 'text-negative'}`}>
        {correct ? 'Correct' : 'Wrong'}
      </p>

      <Link
        to="/pokemon/$name"
        params={{ name: answer.name }}
        className="flex items-baseline gap-2 text-lg text-ink-hi hover:text-accent"
      >
        <span className="text-micro text-ink-lo" data-numeric>
          {dexNo(answer.id)}
        </span>
        {humanize(answer.name)}
      </Link>

      <div className="flex min-h-6 gap-1">
        {pokemon?.types.map((slot) => <TypeChip key={slot.slot} name={slot.type.name} />)}
      </div>

      <button
        type="button"
        autoFocus
        onClick={onNext}
        className="rounded-[3px] bg-accent px-3 py-1 text-micro uppercase text-accent-ink"
      >
        Next
      </button>
    </div>
  )
}

function GameOver({
  streak,
  best,
  onRestart,
}: {
  streak: number
  best: number
  onRestart: () => void
}) {
  return (
    <div className="panel rise flex flex-col items-center gap-3 px-8 py-10">
      <h2 className="text-lg">Out of lives</h2>
      <p className="text-sm text-ink-mid">
        You named <output data-numeric>{streak}</output> in a row.
        {streak === best && streak > 0 ? ' That is a new best.' : ` Your best is ${best}.`}
      </p>
      <button
        type="button"
        autoFocus
        onClick={onRestart}
        className="rounded-[3px] bg-accent px-3 py-1 text-micro uppercase text-accent-ink"
      >
        Play again
      </button>
    </div>
  )
}
