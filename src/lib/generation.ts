import { GENERATIONS, type GenerationName } from 'pokenode-ts'

/** Slug → the number the games are counted by, from the library's own table. */
const ORDER = new Map<string, number>(
  Object.entries(GENERATIONS).map(([key, id]) => [key.toLowerCase().replaceAll('_', '-'), id]),
)

/** The nine generations, oldest first. */
export const GENERATION_NAMES = [...ORDER.keys()] as readonly GenerationName[]

export function isGenerationName(name: string): name is GenerationName {
  return ORDER.has(name)
}

/** Unknown to this version of the library — sorted past the ones it knows. */
const UNKNOWN = Infinity

export function generationOrder(name: string): number {
  return ORDER.get(name) ?? UNKNOWN
}
