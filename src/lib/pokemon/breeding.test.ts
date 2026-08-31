import { describe, expect, it } from 'vitest'
import { eggSteps, genderSplit } from './breeding'

describe('genderSplit', () => {
  it('reads the eighths the API publishes as percentages', () => {
    expect(genderSplit(1)).toEqual({ female: 12.5, male: 87.5 })
  })

  it('answers an even split at four', () => {
    expect(genderSplit(4)).toEqual({ female: 50, male: 50 })
  })

  it('answers all female at eight', () => {
    expect(genderSplit(8)).toEqual({ female: 100, male: 0 })
  })

  it('keeps genderless apart from an even split', () => {
    expect(genderSplit(-1)).toBe('genderless')
  })
})

describe('eggSteps', () => {
  it('counts a cycle as 255 steps', () => {
    expect(eggSteps(20)).toBe(5355)
  })

  it('still owes one cycle at zero', () => {
    expect(eggSteps(0)).toBe(255)
  })
})
