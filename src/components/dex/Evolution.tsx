import { useSuspenseQuery } from '@tanstack/react-query'
import type { PokemonSpecies } from 'pokenode-ts'
import { evolutionChainQuery } from '@/api/queries/evolution'
import { EvolutionGraph } from '@/components/dex/EvolutionGraph'

/** The chain this species sits in, or nothing when it stands alone. */
export function Evolution({ species, current }: { species: PokemonSpecies; current: string }) {
  const { data: chain } = useSuspenseQuery(evolutionChainQuery(species))
  if (chain.chain.evolves_to.length === 0) return null

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Evolution</h2>
      <div className="mt-3">
        <EvolutionGraph chain={chain.chain} current={current} />
      </div>
    </section>
  )
}
