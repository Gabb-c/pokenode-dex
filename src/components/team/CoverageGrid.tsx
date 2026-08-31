import type { CSSProperties } from 'react'
import { TypeChip } from '@/components/dex/TypeChip'
import { teamCoverage, uncovered, type Coverage } from '@/lib/team/coverage'
import { BATTLE_TYPES, typeVar, type Matchups, type TypeName } from '@/lib/types'

/**
 * How the team answers each attacking type.
 *
 * Three tallies per type rather than a verdict: four members weak to ground is
 * a different problem from one weak and none resisting, and a single figure
 * cannot say which. The figures carry the answer; colour only tints the chip
 * that already names its type.
 */
export function CoverageGrid({ charts }: { charts: readonly Matchups[] }) {
  const coverage = teamCoverage(charts)
  const holes = uncovered(coverage)

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Type coverage</h2>

      <div
        tabIndex={0}
        role="region"
        aria-label="Type coverage"
        className="mt-3 overflow-x-auto overscroll-x-contain"
      >
        <table className="w-full border-collapse text-sm sm:min-w-max">
          <thead>
            <tr className="text-micro uppercase text-ink-lo">
              <th scope="col" className="p-2 text-left">
                Attacking
              </th>
              <th scope="col" className="p-2 text-right">
                Weak
              </th>
              <th scope="col" className="p-2 text-right">
                Resist
              </th>
              <th scope="col" className="p-2 text-right">
                Immune
              </th>
            </tr>
          </thead>
          <tbody>
            {BATTLE_TYPES.map((name) => (
              <Row key={name} name={name} tally={coverage[name]} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 border-t border-line pt-2 text-sm text-ink-mid">
        {holes.length === 0
          ? 'Every type is answered by something on this team.'
          : `Nothing here resists ${holes.join(', ')}.`}
      </p>
    </section>
  )
}

function Row({ name, tally }: { name: TypeName; tally: Coverage }) {
  const style = { '--t': typeVar(name) } as CSSProperties

  return (
    <tr className="border-t border-line" style={style}>
      <td className="p-2">
        <TypeChip name={name} asLink={false} />
      </td>
      <td className={`p-2 text-right ${tally.weak > 0 ? 'text-negative' : 'text-ink-lo'}`}>
        {tally.weak}
      </td>
      <td className={`p-2 text-right ${tally.resist > 0 ? 'text-positive' : 'text-ink-lo'}`}>
        {tally.resist}
      </td>
      <td className={`p-2 text-right ${tally.immune > 0 ? 'text-positive' : 'text-ink-lo'}`}>
        {tally.immune}
      </td>
    </tr>
  )
}
