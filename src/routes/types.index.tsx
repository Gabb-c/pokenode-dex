import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { defensiveProfileFrom } from 'pokenode-ts'
import { allTypesQuery } from '@/api/queries/types'
import { TypeChip } from '@/components/dex/TypeChip'
import { ErrorState } from '@/components/ui/ErrorState'
import { effectiveness } from '@/lib/format'
import { BATTLE_TYPES, typeVar } from '@/lib/types'

export const Route = createFileRoute('/types/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(allTypesQuery),
  component: TypeChart,
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} />,
  pendingComponent: () => <p className="py-16 text-center text-ink-lo">Resolving types…</p>,
})

const TONE: Record<number, string> = {
  0: 'bg-surface-2 text-ink-lo',
  0.5: 'text-negative',
  2: 'text-positive',
}

function TypeChart() {
  const { data: types } = useSuspenseQuery(allTypesQuery)
  // One chart per defending type, not one per cell: the grid is 18x18.
  const charts = new Map(types.map((type) => [type.name, defensiveProfileFrom([type])]))

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl tracking-tight">Type effectiveness</h1>
        <p className="mt-1 text-sm text-ink-lo">
          Rows attack, columns defend. Every cell comes from{' '}
          <code className="font-mono text-ink-mid">damage_relations</code>, resolved in one
          batch.
        </p>
      </header>

      <div className="panel w-fit max-w-full overflow-x-auto">
        <table className="min-w-max border-collapse text-micro">
          <caption className="sr-only">
            Damage multiplier of each attacking type against each defending type
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface-1 p-2 text-left">
                Atk ╲ Def
              </th>
              {/* Set vertically rather than abbreviated: a column is identified by its name. */}
              {BATTLE_TYPES.map((name) => (
                <th key={name} scope="col" className="h-24 p-1 align-bottom">
                  <span
                    className="mx-auto block w-4 rotate-180 uppercase [writing-mode:vertical-rl]"
                    style={{ color: typeVar(name) }}
                  >
                    {name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BATTLE_TYPES.map((attacker) => (
              <tr key={attacker} className="border-t border-line">
                <th scope="row" className="sticky left-0 z-10 bg-surface-1 p-2 text-left">
                  <TypeChip name={attacker} />
                </th>
                {BATTLE_TYPES.map((defender) => {
                  const multiplier = charts.get(defender)?.[attacker] ?? 1
                  return (
                    <td
                      key={defender}
                      className={`p-1 text-center ${TONE[multiplier] ?? 'text-ink-lo'}`}
                    >
                      {multiplier === 1 ? '' : `×${effectiveness(multiplier)}`}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
