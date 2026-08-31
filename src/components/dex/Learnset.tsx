import { Suspense } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { Pokemon } from 'pokenode-ts'
import { learnsetQuery } from '@/api/queries/moves'
import { MoveTable } from '@/components/dex/MoveTable'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { humanize } from '@/lib/format'
import { defaultVersionGroup, learnMethodsOf, versionGroupsOf } from '@/lib/moves/learnset'

interface LearnsetProps {
  pokemon: Pokemon
  /** What was asked for. Both fall back to what this Pokémon actually has. */
  requestedGroup: string | undefined
  requestedMethod: string | undefined
  onSelect: (next: { vg: string; learn: string | undefined }) => void
}

/**
 * One version group and one learn method at a time.
 *
 * Both pickers are built from the links the Pokémon already carries, so
 * choosing costs nothing until a tab is opened — and only the open tab is
 * resolved.
 */
export function Learnset({
  pokemon,
  requestedGroup,
  requestedMethod,
  onSelect,
}: LearnsetProps) {
  const groups = versionGroupsOf(pokemon.moves)
  if (groups.length === 0) return null

  const versionGroup =
    requestedGroup && groups.includes(requestedGroup)
      ? requestedGroup
      : (defaultVersionGroup(pokemon.moves) ?? groups[0])
  const methods = learnMethodsOf(pokemon.moves, versionGroup)
  const method = methods.some(({ name }) => name === requestedMethod)
    ? requestedMethod
    : methods[0]?.name

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-micro uppercase text-ink-lo">Moves</h2>
        <div className="ml-auto">
          <Select
            label="Version"
            value={versionGroup}
            // A method belongs to its version group, so picking a group clears it.
            onChange={(vg) => onSelect({ vg, learn: undefined })}
          >
            {groups.map((group) => (
              <option key={group} value={group}>
                {humanize(group)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Learn method">
        {methods.map(({ name, count }) => (
          <button
            key={name}
            type="button"
            aria-pressed={name === method}
            onClick={() => onSelect({ vg: versionGroup, learn: name })}
            className={`well px-2.5 py-1 text-sm ${
              name === method ? 'text-ink-hi' : 'text-ink-lo hover:text-ink-mid'
            }`}
          >
            {humanize(name)}
            <span className="ml-2 text-micro text-ink-lo" data-numeric>
              {count}
            </span>
          </button>
        ))}
      </div>

      {method && (
        <div className="mt-3">
          <Suspense fallback={<Skeleton label="Moves" lines={5} />}>
            <LearnsetTable pokemon={pokemon} versionGroup={versionGroup} method={method} />
          </Suspense>
        </div>
      )}
    </section>
  )
}

function LearnsetTable({
  pokemon,
  versionGroup,
  method,
}: {
  pokemon: Pokemon
  versionGroup: string
  method: string
}) {
  const { data: moves } = useSuspenseQuery(learnsetQuery(pokemon, versionGroup, method))
  if (moves.length === 0) return <p className="text-sm text-ink-lo">Nothing learned this way.</p>

  return <MoveTable moves={moves} />
}
