import type { PokemonSpecies } from 'pokenode-ts'
import { humanize } from '@/lib/format'
import { eggSteps, genderSplit } from '@/lib/pokemon/breeding'

/** The paperwork a species carries that the vitals panel leaves out. */
export function Breeding({ species }: { species: PokemonSpecies }) {
  const split = genderSplit(species.gender_rate)

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Breeding</h2>
      <dl className="mt-3 flex flex-col gap-2 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-lo">Egg groups</dt>
          <dd className="text-right text-ink-hi">
            {species.egg_groups.map((group) => humanize(group.name)).join(', ') || '—'}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-lo">Gender</dt>
          <dd className="text-right text-ink-hi">
            {split === 'genderless' ? (
              'Genderless'
            ) : (
              <>
                <output data-numeric>{split.male}</output>% male ·{' '}
                <output data-numeric>{split.female}</output>% female
              </>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-lo">Hatch</dt>
          <dd className="text-ink-hi">
            <output data-numeric>{eggSteps(species.hatch_counter)}</output> steps
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-lo">Base happiness</dt>
          <dd className="text-ink-hi" data-numeric>
            {species.base_happiness}
          </dd>
        </div>
      </dl>
    </section>
  )
}
