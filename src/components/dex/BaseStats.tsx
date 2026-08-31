import type { Pokemon } from 'pokenode-ts'
import { StatBar } from '@/components/dex/StatBar'
import { humanize } from '@/lib/format'

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

function shortStat(name: string): string {
  return STAT_LABELS[name] ?? humanize(name)
}

export function BaseStats({ pokemon, tint }: { pokemon: Pokemon; tint: string }) {
  const total = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)

  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Base stats</h2>
      <div className="mt-3 flex flex-col gap-2">
        {pokemon.stats.map((stat) => (
          <StatBar
            key={stat.stat.name}
            label={shortStat(stat.stat.name)}
            value={stat.base_stat}
            tint={tint}
          />
        ))}
      </div>
      <p className="mt-3 border-t border-line pt-2 text-right text-sm text-ink-mid">
        Total <output className="text-ink-hi">{total}</output>
      </p>
    </section>
  )
}
