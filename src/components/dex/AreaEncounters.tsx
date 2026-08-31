import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getPokemonSpriteUrl, resourceId, type Location } from 'pokenode-ts'
import { locationAreasQuery } from '@/api/queries/locations'
import { Select } from '@/components/ui/Select'
import { humanize } from '@/lib/format'
import { encountersIn, versionsIn } from '@/lib/locations/encounters'

interface AreaEncountersProps {
  location: Location
  /** The version asked for. Which versions exist is only known once this loads. */
  requested: string | undefined
  onSelect: (version: string) => void
}

/**
 * What lives in one place, in one game.
 *
 * A location names its areas and each area carries every encounter in it, so
 * the picker below costs nothing: the versions are read out of the payload the
 * table is already drawn from.
 */
export function AreaEncounters({ location, requested, onSelect }: AreaEncountersProps) {
  const { data: areas } = useSuspenseQuery(locationAreasQuery(location))

  const versions = versionsIn(areas)
  if (versions.length === 0) {
    return (
      <section className="panel p-4">
        <h2 className="text-micro uppercase text-ink-lo">{humanize(location.name)}</h2>
        <p className="mt-3 text-sm text-ink-lo">Nothing is recorded as living here.</p>
      </section>
    )
  }

  const version = requested && versions.includes(requested) ? requested : versions[0]
  const rows = encountersIn(areas, version)
  const named = areas.length > 1

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-micro uppercase text-ink-lo">{humanize(location.name)}</h2>
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

      <div
        key={version}
        tabIndex={0}
        role="region"
        aria-label="Encounters"
        className="fade-in mt-3 overflow-x-auto overscroll-x-contain"
      >
        <table className="w-full border-collapse text-sm sm:min-w-max">
          <thead>
            <tr className="text-micro uppercase text-ink-lo">
              <th scope="col" className="min-w-32 p-2 text-left">
                Who
              </th>
              {/* One area is the common case, and a column repeating its name says nothing. */}
              {named && (
                <th scope="col" className="p-2 text-left">
                  Where
                </th>
              )}
              <th scope="col" className="p-2 text-left">
                How
              </th>
              <th scope="col" className="p-2 text-right">
                Levels
              </th>
              <th scope="col" className="p-2 text-right">
                Chance
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.area}/${row.pokemon.name}/${row.method}`} className="border-t border-line">
                <td className="p-2">
                  <Link
                    to="/pokemon/$name"
                    params={{ name: row.pokemon.name }}
                    search={{}}
                    className="flex items-center gap-2 text-accent hover:underline"
                  >
                    {/* Built from the id the link already carries, so a table of
                        forty rows costs no request. The name is the label. */}
                    <img
                      src={getPokemonSpriteUrl(resourceId(row.pokemon))}
                      alt=""
                      width={32}
                      height={32}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="size-8 shrink-0 object-contain [image-rendering:pixelated]"
                    />
                    {humanize(row.pokemon.name)}
                  </Link>
                </td>
                {named && <td className="p-2 text-ink-lo">{humanize(row.area)}</td>}
                <td className="p-2 text-ink-mid">{humanize(row.method)}</td>
                <td className="p-2 text-right text-ink-hi">
                  {row.minLevel === row.maxLevel
                    ? row.minLevel
                    : `${row.minLevel}–${row.maxLevel}`}
                </td>
                <td className="p-2 text-right text-ink-hi">{row.chance}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
