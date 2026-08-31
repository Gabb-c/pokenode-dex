import type { GenerationName } from 'pokenode-ts'
import { isGenerationName } from './generation'
import { isBattleType, type TypeName } from './types'

/**
 * Readers for the typed search params every filtered view keeps in its URL.
 *
 * Two rules they exist to hold in one place. A param is **absent rather than
 * empty**, so an unfiltered view has a clean URL and a shared link says only
 * what was actually chosen. And only the *shape* is checked here — a slug this
 * resource has no data for falls back in the panel that reads it, which is the
 * only place that knows what it carries.
 */
export function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

export function optionalGeneration(value: unknown): GenerationName | undefined {
  return typeof value === 'string' && isGenerationName(value) ? value : undefined
}

export function optionalBattleType(value: unknown): TypeName | undefined {
  return typeof value === 'string' && isBattleType(value) ? value : undefined
}

export function battleTypes(value: unknown): TypeName[] | undefined {
  if (!Array.isArray(value)) return undefined
  const names = value.filter(isBattleType)
  return names.length > 0 ? names : undefined
}

/**
 * Drops the keys the readers above left `undefined`, so no empty param survives.
 *
 * `Object.fromEntries` widens to a string index, so an assertion back to `T` is
 * unavoidable however this is written. It is sound because every key of a search
 * shape is optional: a `T` with its absent keys removed is still a `T`.
 */
export function compact<T extends object>(params: T): T {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as T
}
