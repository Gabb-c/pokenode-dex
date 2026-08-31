import { Suspense } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { defensiveProfile, type GenerationName, type Pokemon } from 'pokenode-ts'
import { allTypesQuery, matchupsQuery } from '@/api/queries/types'
import { GenerationPicker } from '@/components/dex/GenerationPicker'
import { TypeChip } from '@/components/dex/TypeChip'
import { Skeleton } from '@/components/ui/Skeleton'
import { effectiveness } from '@/lib/format'
import { typesIn } from '@/lib/pokemon/past-types'
import { notableMatchups, type Matchups as MatchupChart } from '@/lib/types'

interface MatchupsProps {
  pokemon: Pokemon
  /** The chart to read against; absent is the one in force today. */
  generation: GenerationName | undefined
  onGenerationChange: (next: GenerationName | undefined) => void
}

/**
 * What every attacking type does to this Pokémon, in the generation asked for.
 *
 * The two charts are different questions, not one with a flag. Today's is read
 * off the defender alone — one or two resources — while a past one needs every
 * attacking type, because only the attacker carries its own history. The
 * defender is scoped too: reading Magnemite with its modern typing against a
 * Gen I chart would answer confidently and wrongly.
 */
export function Matchups({ pokemon, generation, onGenerationChange }: MatchupsProps) {
  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-micro uppercase text-ink-lo">Defensive matchups</h2>
        <div className="ml-auto">
          <GenerationPicker value={generation} onChange={onGenerationChange} />
        </div>
      </div>
      {/* Keyed on the chart being read: both queries are cached, so switching
          generation resolves without re-suspending and would otherwise swap in
          place. */}
      <Suspense key={generation ?? 'current'} fallback={<Skeleton label="Defensive matchups" />}>
        {generation ? (
          <PastChart pokemon={pokemon} generation={generation} />
        ) : (
          <CurrentChart pokemon={pokemon} />
        )}
      </Suspense>
    </section>
  )
}

function CurrentChart({ pokemon }: { pokemon: Pokemon }) {
  const { data: chart } = useSuspenseQuery(matchupsQuery(pokemon))
  return <MatchupGroups chart={chart} />
}

function PastChart({ pokemon, generation }: { pokemon: Pokemon; generation: GenerationName }) {
  const { data: types } = useSuspenseQuery(allTypesQuery)
  const defending = typesIn(pokemon, generation).map((slot) => slot.type)

  return <MatchupGroups chart={defensiveProfile(types, defending, { generation })} />
}

function MatchupGroups({ chart }: { chart: MatchupChart }) {
  const { weaknesses, resistances, immunities } = notableMatchups(chart)

  const groups = [
    ['Weak to', weaknesses],
    ['Resists', resistances],
    ['Immune to', immunities],
  ] as const

  return (
    <div className="fade-in mt-3 flex flex-col gap-3">
      {groups.map(([label, names]) =>
        names.length === 0 ? null : (
          <div key={label} className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 text-micro uppercase text-ink-lo">{label}</span>
            {names.map((name) => (
              <span key={name} className="flex items-center gap-1">
                <TypeChip name={name} />
                <span className="text-micro text-ink-lo" data-numeric>
                  ×{effectiveness(chart[name] ?? 1)}
                </span>
              </span>
            ))}
          </div>
        ),
      )}
    </div>
  )
}
