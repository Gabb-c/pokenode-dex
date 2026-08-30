import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { relationsFor, resourceId, type GenerationName, type TypeRelations } from 'pokenode-ts'
import { typeQuery } from '@/api/queries/types'
import { cached, isNotFound } from '@/api/query-client'
import { GenerationPicker } from '@/components/dex/GenerationPicker'
import { TypeChip } from '@/components/dex/TypeChip'
import { ErrorState } from '@/components/ui/ErrorState'
import { generationLabel, humanize } from '@/lib/format'
import { isGenerationName } from '@/lib/generation'
import { isBattleType } from '@/lib/types'

/** Enough to browse; the dex filter is the right tool past this. */
const LISTED = 120

interface ChartSearch {
  /** Absent for the chart in force today, so the default view has a clean URL. */
  gen?: GenerationName
}

export const Route = createFileRoute('/types/$name')({
  validateSearch: (input: Record<string, unknown>): ChartSearch => {
    const gen = typeof input.gen === 'string' && isGenerationName(input.gen) ? input.gen : undefined
    return gen ? { gen } : {}
  },
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.query(cached(typeQuery(params.name)))
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
  },
  component: TypeDetail,
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} />,
})

function TypeDetail() {
  const { name } = Route.useParams()
  const { gen } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: type } = useSuspenseQuery(typeQuery(name))

  // Nothing is guessed for a type that did not exist yet: the relations are
  // missing rather than neutral, and the panel says so.
  const relations = relationsFor(type, gen)

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-baseline gap-4">
        <h1 className="text-2xl tracking-tight">{humanize(type.name)}</h1>
        <TypeChip name={type.name} asLink={false} />
        <span className="text-micro text-ink-lo">
          <output data-numeric>{type.pokemon.length}</output> Pokémon
        </span>
        <div className="ml-auto">
          <GenerationPicker
            value={gen}
            onChange={(next) => void navigate({ search: next ? { gen: next } : {}, replace: true })}
          />
        </div>
      </header>

      {relations ? (
        <Relations relations={relations} />
      ) : (
        <p className="panel max-w-3xl p-4 text-sm text-ink-mid">
          {humanize(type.name)} did not exist in {gen ? generationLabel(gen) : 'that generation'}.
        </p>
      )}

      <section>
        <h2 className="text-micro uppercase text-ink-lo">Pokémon</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {type.pokemon.slice(0, LISTED).map(({ pokemon }) => (
            <li key={pokemon.name}>
              <Link
                to="/pokemon/$name"
                params={{ name: pokemon.name }}
                className="well block px-2.5 py-1 text-sm text-ink-hi hover:text-accent"
              >
                <span className="mr-2 text-micro text-ink-lo" data-numeric>
                  {resourceId(pokemon)}
                </span>
                {humanize(pokemon.name)}
              </Link>
            </li>
          ))}
        </ul>
        {type.pokemon.length > LISTED && isBattleType(type.name) && (
          <p className="mt-3 text-sm text-ink-lo">
            The first <output data-numeric>{LISTED}</output> of{' '}
            <output data-numeric>{type.pokemon.length}</output>.{' '}
            <Link to="/pokemon" search={{ types: [type.name] }} className="text-accent">
              See them all in the dex
            </Link>
            .
          </p>
        )}
      </section>
    </section>
  )
}

function Relations({ relations }: { relations: TypeRelations }) {
  const groups = [
    ['Strong against', relations.double_damage_to],
    ['Weak against', relations.half_damage_to],
    ['No effect on', relations.no_damage_to],
    ['Takes double from', relations.double_damage_from],
    ['Takes half from', relations.half_damage_from],
    ['Immune to', relations.no_damage_from],
  ] as const

  return (
    <div className="panel max-w-3xl divide-y divide-line">
      {groups.map(([label, links]) => (
        <div key={label} className="flex flex-wrap items-center gap-2 p-3">
          <span className="w-40 shrink-0 text-micro uppercase text-ink-lo">{label}</span>
          {links.length === 0 ? (
            <span className="text-sm text-ink-lo">—</span>
          ) : (
            links.map((link) => <TypeChip key={link.name} name={link.name} />)
          )}
        </div>
      ))}
    </div>
  )
}
