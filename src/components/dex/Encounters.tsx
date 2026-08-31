import { useSuspenseQuery } from '@tanstack/react-query'
import type { Pokemon } from 'pokenode-ts'
import { encountersQuery } from '@/api/queries/encounters'
import { EncounterTable } from '@/components/dex/EncounterTable'
import { Select } from '@/components/ui/Select'
import { humanize } from '@/lib/format'
import { encountersIn, versionsOf } from '@/lib/pokemon/encounters'

interface EncountersProps {
  pokemon: Pokemon
  /** The version asked for. Which versions exist is only known once this loads. */
  requested: string | undefined
  onSelect: (version: string) => void
}

/**
 * Where a wild one is found, one game at a time.
 *
 * One request carries every version, so the picker is free — and it is not
 * started in the route's loader: like the learnset, this sits below the fold.
 */
export function Encounters({ pokemon, requested, onSelect }: EncountersProps) {
  const { data: areas } = useSuspenseQuery(encountersQuery(pokemon.id))

  const versions = versionsOf(areas)
  if (versions.length === 0) return null

  const version = requested && versions.includes(requested) ? requested : versions[0]
  const rows = encountersIn(areas, version)

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-micro uppercase text-ink-lo">Where to find</h2>
        <div className="ml-auto">
          <Select label="Version" value={version} onChange={onSelect}>
            {versions.map((slug) => (
              <option key={slug} value={slug}>
                {humanize(slug)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3">
        <EncounterTable key={version} rows={rows} />
      </div>
    </section>
  )
}
