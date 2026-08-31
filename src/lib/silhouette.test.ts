import { describe, expect, it } from 'vitest'
import type { DexEntry } from '@/api/queries/search-index'
import { isCorrectGuess, pickAnswer, playablePool } from './silhouette'

const entry = (id: number, name: string): DexEntry => ({
  id,
  name,
  no: String(id).padStart(4, '0'),
})

const INDEX = [
  entry(1, 'bulbasaur'),
  entry(25, 'pikachu'),
  entry(122, 'mr-mime'),
  entry(151, 'mew'),
  entry(10034, 'charizard-mega-x'),
]

describe('playablePool', () => {
  it('leaves out the alternate forms numbered above the national dex', () => {
    expect(playablePool(INDEX).map((found) => found.name)).not.toContain('charizard-mega-x')
  })

  it('narrows to a generation once its membership is known', () => {
    const kanto = new Set([1, 25, 122, 151])

    expect(playablePool(INDEX, kanto)).toHaveLength(4)
    expect(playablePool(INDEX, new Set([25])).map((found) => found.name)).toEqual(['pikachu'])
  })

  it('skips a membership set still in flight rather than emptying the pool', () => {
    expect(playablePool(INDEX, undefined)).toHaveLength(4)
  })
})

describe('pickAnswer', () => {
  const pool = playablePool(INDEX)

  it('draws from the pool at the position the source lands on', () => {
    expect(pickAnswer(pool, new Set(), () => 0)?.name).toBe('bulbasaur')
    expect(pickAnswer(pool, new Set(), () => 0.99)?.name).toBe('mew')
  })

  it('does not ask the same Pokémon twice in a run', () => {
    const seen = new Set([1, 25])

    expect(pickAnswer(pool, seen, () => 0)?.name).toBe('mr-mime')
  })

  it('starts the pool over once the run has seen all of it', () => {
    const seen = new Set(pool.map((found) => found.id))

    expect(pickAnswer(pool, seen, () => 0)?.name).toBe('bulbasaur')
  })

  it('has nothing to draw from an empty pool', () => {
    expect(pickAnswer([], new Set())).toBeUndefined()
  })
})

describe('isCorrectGuess', () => {
  const answer = entry(122, 'mr-mime')

  it('accepts the slug, the display form and the punctuation people type', () => {
    expect(isCorrectGuess('mr-mime', answer)).toBe(true)
    expect(isCorrectGuess('Mr Mime', answer)).toBe(true)
    expect(isCorrectGuess('Mr. Mime', answer)).toBe(true)
    expect(isCorrectGuess('  MRMIME ', answer)).toBe(true)
  })

  it('rejects a different Pokémon', () => {
    expect(isCorrectGuess('mime-jr', answer)).toBe(false)
  })
})
