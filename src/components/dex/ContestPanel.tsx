import { useSuspenseQuery } from '@tanstack/react-query'
import type { Move } from 'pokenode-ts'
import { contestEffectQuery, superContestEffectQuery } from '@/api/queries/contest'
import { humanize } from '@/lib/format'

/**
 * What a move is worth outside a battle.
 *
 * Both effects are `APIResource` links — a bare URL with no name, because the
 * endpoints behind them have no slug to give. `resolve` follows them exactly as
 * it follows a named link.
 *
 * The contest type is rendered as a label. The API publishes a colour with each
 * of its names, and none of them is held to this app's contrast floor, so the
 * name is the whole of what is shown.
 */
export function ContestPanel({ move }: { move: Move }) {
  const { data: contest } = useSuspenseQuery(contestEffectQuery(move))
  const { data: superContest } = useSuspenseQuery(superContestEffectQuery(move))

  if (!move.contest_type && !contest && !superContest) return null

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Contests</h2>
      <dl className="mt-3 flex flex-col gap-2 text-sm">
        {move.contest_type && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-lo">Category</dt>
            <dd className="text-ink-hi">{humanize(move.contest_type.name)}</dd>
          </div>
        )}
        {contest && (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-lo">Appeal</dt>
              <dd className="text-ink-hi" data-numeric>
                {contest.appeal}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-lo">Jam</dt>
              <dd className="text-ink-hi" data-numeric>
                {contest.jam}
              </dd>
            </div>
          </>
        )}
        {superContest && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-lo">Super contest appeal</dt>
            <dd className="text-ink-hi" data-numeric>
              {superContest.appeal}
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}
