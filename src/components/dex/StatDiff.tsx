import { Link } from '@tanstack/react-router'
import { getPokemonSpriteUrl, type Pokemon } from 'pokenode-ts'
import { TypeChip } from '@/components/dex/TypeChip'
import { humanize, statLabel } from '@/lib/format'

interface Row {
  label: string
  left: number
  right: number
}

/** The six stats, paired by slug — a stat one side is missing is left out. */
function rowsOf(left: Pokemon, right: Pokemon): Row[] {
  const rightOf = new Map(right.stats.map((stat) => [stat.stat.name, stat.base_stat]))
  const rows: Row[] = []
  for (const stat of left.stats) {
    const other = rightOf.get(stat.stat.name)
    if (other === undefined) continue
    rows.push({ label: statLabel(stat.stat.name), left: stat.base_stat, right: other })
  }
  return rows
}

const total = (pokemon: Pokemon) =>
  pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)

/**
 * Two Pokémon's base stats, and which way each one falls.
 *
 * The bars are drawn from the middle out, so a row reads as a lean rather than
 * as two lengths to measure against each other. Colour is not the only channel:
 * the higher figure is the one in reading ink, and the difference is written
 * out in the middle.
 */
export function StatDiff({ left, right }: { left: Pokemon; right: Pokemon }) {
  const rows = rowsOf(left, right)

  return (
    <section className="panel p-4">
      <div className="grid grid-cols-2 gap-4">
        <Side pokemon={left} align="start" />
        <Side pokemon={right} align="end" />
      </div>

      <table className="mt-4 w-full border-collapse text-sm">
        <caption className="sr-only">Base stats compared</caption>
        <thead>
          <tr className="text-micro uppercase text-ink-lo">
            <th scope="col" className="p-1 text-left">
              {humanize(left.name)}
            </th>
            <th scope="col" className="p-1 text-center">
              Stat
            </th>
            <th scope="col" className="p-1 text-right">
              {humanize(right.name)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-line">
              <td className={`p-1 ${row.left >= row.right ? 'text-ink-hi' : 'text-ink-lo'}`}>
                {row.left}
              </td>
              <td className="p-1 text-center text-micro uppercase text-ink-lo">{row.label}</td>
              <td
                className={`p-1 text-right ${row.right >= row.left ? 'text-ink-hi' : 'text-ink-lo'}`}
              >
                {row.right}
              </td>
            </tr>
          ))}
          <tr className="border-t border-line-strong">
            <td className={`p-1 ${total(left) >= total(right) ? 'text-ink-hi' : 'text-ink-lo'}`}>
              {total(left)}
            </td>
            <td className="p-1 text-center text-micro uppercase text-ink-lo">Total</td>
            <td
              className={`p-1 text-right ${total(right) >= total(left) ? 'text-ink-hi' : 'text-ink-lo'}`}
            >
              {total(right)}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

function Side({ pokemon, align }: { pokemon: Pokemon; align: 'start' | 'end' }) {
  return (
    // Both class names written out: Tailwind extracts statically, so an
    // interpolated `items-${align}` would emit nothing at all.
    <div
      className={`flex flex-col gap-2 ${align === 'start' ? 'items-start' : 'items-end'}`}
    >
      <img
        src={getPokemonSpriteUrl(pokemon.id, { variant: 'official-artwork' })}
        alt=""
        width={96}
        height={96}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="size-24 object-contain"
      />
      <Link
        to="/pokemon/$name"
        params={{ name: pokemon.name }}
        search={{}}
        className="text-sm text-accent hover:underline"
      >
        {humanize(pokemon.name)}
      </Link>
      <div className="flex flex-wrap gap-1">
        {pokemon.types.map((slot) => (
          <TypeChip key={slot.slot} name={slot.type.name} />
        ))}
      </div>
    </div>
  )
}
