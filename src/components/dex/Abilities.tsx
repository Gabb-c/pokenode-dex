import { Suspense } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { Ability, Pokemon } from 'pokenode-ts'
import { abilitiesQuery } from '@/api/queries/abilities'
import { cleanFlavorText, humanize } from '@/lib/format'
import { useLatestFlavor, useLocalized } from '@/hooks/use-language'

/**
 * The slugs are in the Pokémon payload, so they paint immediately; the effect
 * text is a link away and arrives under the boundary below.
 */
export function Abilities({ pokemon }: { pokemon: Pokemon }) {
  return (
    <section className="panel p-4">
      <h2 className="text-micro uppercase text-ink-lo">Abilities</h2>
      <Suspense fallback={<AbilitySlugs pokemon={pokemon} />}>
        <AbilityEffects pokemon={pokemon} />
      </Suspense>
    </section>
  )
}

function AbilitySlugs({ pokemon }: { pokemon: Pokemon }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {pokemon.abilities.map((entry) => (
        <li key={entry.ability.name} className="well px-2.5 py-1 text-sm text-ink-hi">
          {humanize(entry.ability.name)}
          {entry.is_hidden && <span className="ml-2 text-micro text-ink-lo">hidden</span>}
        </li>
      ))}
    </ul>
  )
}

function AbilityEffects({ pokemon }: { pokemon: Pokemon }) {
  const { data: abilities } = useSuspenseQuery(abilitiesQuery(pokemon))

  return (
    <ul className="mt-3 flex flex-col gap-3">
      {abilities.map((ability, index) => (
        <AbilityRow
          key={ability.id}
          ability={ability}
          hidden={pokemon.abilities[index]?.is_hidden ?? false}
        />
      ))}
    </ul>
  )
}

function AbilityRow({ ability, hidden }: { ability: Ability; hidden: boolean }) {
  const name = useLocalized(ability.names)?.name ?? humanize(ability.name)
  // The PokéAPI publishes effect text in English alone for most abilities, so
  // this is the fallback in `useLocalized` earning its place rather than a gap.
  const effect = useLocalized(ability.effect_entries)?.short_effect
  const flavor = useLatestFlavor(ability.flavor_text_entries)

  return (
    <li className="flex flex-col gap-1">
      <p className="text-sm text-ink-hi">
        {name}
        {hidden && <span className="ml-2 text-micro uppercase text-ink-lo">hidden</span>}
      </p>
      <p className="max-w-[62ch] text-sm text-ink-mid">
        {effect ?? (flavor ? cleanFlavorText(flavor.flavor_text) : '—')}
      </p>
    </li>
  )
}
