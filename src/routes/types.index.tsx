import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { relationsFor, type GenerationName, type TypeRelations } from 'pokenode-ts'
import { allTypesQuery } from '@/api/queries/types'
import { cached } from '@/api/query-client'
import { GenerationPicker } from '@/components/dex/GenerationPicker'
import { TypeChip } from '@/components/dex/TypeChip'
import { ErrorState } from '@/components/ui/ErrorState'
import { effectiveness, generationLabel } from '@/lib/format'
import { isGenerationName } from '@/lib/generation'
import { BATTLE_TYPES, typeVar, type TypeName } from '@/lib/types'

interface ChartSearch {
  /** Absent for the chart in force today, so the default view has a clean URL. */
  gen?: GenerationName
}

export const Route = createFileRoute('/types/')({
  validateSearch: (input: Record<string, unknown>): ChartSearch => {
    const gen = typeof input.gen === 'string' && isGenerationName(input.gen) ? input.gen : undefined
    return gen ? { gen } : {}
  },
  loader: ({ context }) => context.queryClient.query(cached(allTypesQuery)),
  component: TypeChart,
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} />,
  pendingComponent: () => <p className="py-16 text-center text-ink-lo">Resolving types…</p>,
})

const TONE: Record<number, string> = {
  0: 'bg-surface-2 text-ink-lo',
  0.5: 'text-negative',
  2: 'text-positive',
}

/** Read off the attacker's own offensive relations, so a row is one lookup. */
function multiplierOf(relations: TypeRelations, defender: string): number {
  if (relations.no_damage_to.some((link) => link.name === defender)) return 0
  if (relations.half_damage_to.some((link) => link.name === defender)) return 0.5
  if (relations.double_damage_to.some((link) => link.name === defender)) return 2
  return 1
}

function TypeChart() {
  const { gen } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: types } = useSuspenseQuery(allTypesQuery)

  // `relationsFor` returns nothing for a type that did not exist yet, and a
  // neutral row would be a confidently wrong answer — so it leaves both axes.
  const charts = new Map<string, TypeRelations>()
  for (const type of types) {
    const relations = relationsFor(type, gen)
    if (relations) charts.set(type.name, relations)
  }
  const axis = BATTLE_TYPES.filter((name) => charts.has(name))

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <h1 className="text-2xl tracking-tight">Type effectiveness</h1>
          <p className="mt-1 text-sm text-ink-lo">
            Rows attack, columns defend. Every cell comes from{' '}
            <code className="font-mono text-ink-mid">relationsFor</code>, which reads the chart of
            a past generation off the same resolved batch.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {gen && (
            <span className="text-micro uppercase text-ink-lo">
              <output>{axis.length}</output> of {BATTLE_TYPES.length} types existed
            </span>
          )}
          <GenerationPicker
            value={gen}
            onChange={(next) => void navigate({ search: next ? { gen: next } : {}, replace: true })}
          />
        </div>
      </header>

      {/* Keyed on the generation, not per cell: the chart is eighteen squared. */}
      <div key={gen ?? 'current'} className="fade-in panel w-fit max-w-full overflow-x-auto">
        <table className="min-w-max border-collapse text-micro">
          <caption className="sr-only">
            Damage multiplier of each attacking type against each defending type
            {gen ? ` in ${generationLabel(gen)}` : ''}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface-1 p-2 text-left">
                Atk ╲ Def
              </th>
              {/* Set vertically rather than abbreviated: a column is identified by its name. */}
              {axis.map((name) => (
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
            {axis.map((attacker) => (
              <ChartRow
                key={attacker}
                attacker={attacker}
                axis={axis}
                relations={charts.get(attacker)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ChartRow({
  attacker,
  axis,
  relations,
}: {
  attacker: TypeName
  axis: readonly TypeName[]
  relations: TypeRelations | undefined
}) {
  if (!relations) return null

  return (
    <tr className="border-t border-line">
      <th scope="row" className="sticky left-0 z-10 bg-surface-1 p-2 text-left">
        <TypeChip name={attacker} />
      </th>
      {axis.map((defender) => {
        const multiplier = multiplierOf(relations, defender)
        return (
          <td key={defender} className={`p-1 text-center ${TONE[multiplier] ?? 'text-ink-lo'}`}>
            {multiplier === 1 ? '' : `×${effectiveness(multiplier)}`}
          </td>
        )
      })}
    </tr>
  )
}
