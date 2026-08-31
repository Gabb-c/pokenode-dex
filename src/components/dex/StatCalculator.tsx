import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { Pokemon } from 'pokenode-ts'
import { allNaturesQuery } from '@/api/queries/natures'
import { StatBar } from '@/components/dex/StatBar'
import { Select } from '@/components/ui/Select'
import { humanize, statLabel } from '@/lib/format'
import { battleStats, statKey, type StatKey } from '@/lib/battle/stats'

const LEVELS = [1, 50, 100] as const

/** Blissey's HP at level 100 with a perfect spread — the top of what these bars can read. */
const MAX_RAISED = 714
const IVS = [0, 31] as const
/** The two spreads worth offering: untrained, and a stat maxed out. */
const EVS = [0, 252] as const

/** Keyed by the field rather than the slug, which is what `battleStats` returns. */
const SLUGS: Record<StatKey, string> = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  specialAttack: 'special-attack',
  specialDefense: 'special-defense',
  speed: 'speed',
}

/**
 * What a Pokémon's stats actually come to, once it has been raised.
 *
 * The base stats above are the species; these are the individual. The natures
 * are the only thing here that costs a request, and they are held for the
 * session — which is why this panel is mounted below the fold rather than
 * loaded with the page.
 */
export function StatCalculator({ pokemon, tint }: { pokemon: Pokemon; tint: string }) {
  const { data: natures } = useSuspenseQuery(allNaturesQuery)

  const [level, setLevel] = useState(50)
  const [ivs, setIvs] = useState(31)
  const [evs, setEvs] = useState(0)
  const [natureName, setNatureName] = useState('')

  const nature = natures.find((entry) => entry.name === natureName) ?? null
  // One trained stat, not six: 510 is the whole budget a Pokémon has, so
  // spreading 252 across every stat is not a spread the games allow.
  const raised = nature?.increased_stat && statKey(nature.increased_stat.name)
  const stats = battleStats(pokemon, level, {
    ivs,
    nature,
    evs: raised ? { [raised]: evs } : {},
  })

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-micro uppercase text-ink-lo">Stats when raised</h2>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <Select label="Level" value={String(level)} onChange={(next) => setLevel(Number(next))}>
          {LEVELS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>

        <Select label="Nature" value={natureName} onChange={setNatureName}>
          <option value="">neutral</option>
          {natures.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {humanize(entry.name)}
            </option>
          ))}
        </Select>

        <Select label="IVs" value={String(ivs)} onChange={(next) => setIvs(Number(next))}>
          {IVS.map((value) => (
            <option key={value} value={value}>
              {value === 31 ? 'perfect' : 'none'}
            </option>
          ))}
        </Select>

        <Select label="EVs" value={String(evs)} onChange={(next) => setEvs(Number(next))}>
          {EVS.map((value) => (
            <option key={value} value={value}>
              {value === 0 ? 'untrained' : '252 in the raised stat'}
            </option>
          ))}
        </Select>
      </div>

      {nature && (
        <p className="mt-3 text-micro uppercase text-ink-lo">
          {nature.increased_stat && nature.decreased_stat
            ? `${humanize(nature.increased_stat.name)} up · ${humanize(nature.decreased_stat.name)} down`
            : 'No stat is favoured'}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {(Object.keys(SLUGS) as StatKey[]).map((key) => (
          <StatBar
            key={key}
            label={statLabel(SLUGS[key])}
            value={stats[key]}
            tint={tint}
            max={MAX_RAISED}
          />
        ))}
      </div>
    </section>
  )
}
