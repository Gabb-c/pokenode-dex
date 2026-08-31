import { describe, expect, it } from 'vitest'
import {
  attempt,
  burnPenalty,
  effectiveSpeed,
  residual,
  sleepFor,
  statusFrom,
} from './status'

describe('statusFrom', () => {
  it('reads an ailment slug this tier models', () => {
    expect(statusFrom('paralysis')).toBe('paralysis')
  })

  it('folds bad poison into plain poison', () => {
    expect(statusFrom('bad-poison')).toBe('poison')
  })

  it('answers nothing for an ailment it does not model', () => {
    expect(statusFrom('confusion')).toBeUndefined()
  })

  it('answers nothing for a move with no ailment at all', () => {
    expect(statusFrom(undefined)).toBeUndefined()
  })
})

describe('attempt', () => {
  it('lets an unafflicted fighter move', () => {
    expect(attempt({ status: null, sleepTurns: 0 }, () => 0)).toMatchObject({ acts: true })
  })

  it('keeps a sleeping fighter down and counts the turn off', () => {
    const result = attempt({ status: 'sleep', sleepTurns: 3 }, () => 0.5)
    expect(result).toMatchObject({ acts: false, blocked: 'sleep' })
    expect(result.next.sleepTurns).toBe(2)
  })

  it('wakes on the last turn and says so', () => {
    const result = attempt({ status: 'sleep', sleepTurns: 1 }, () => 0.5)
    expect(result).toMatchObject({ acts: true, cured: 'sleep' })
    expect(result.next.status).toBeNull()
  })

  it('thaws on a low draw', () => {
    expect(attempt({ status: 'freeze', sleepTurns: 0 }, () => 0.1)).toMatchObject({
      acts: true,
      cured: 'freeze',
    })
  })

  it('stays frozen on a high one', () => {
    expect(attempt({ status: 'freeze', sleepTurns: 0 }, () => 0.9)).toMatchObject({
      acts: false,
      blocked: 'freeze',
    })
  })

  it('drops a paralysed turn a quarter of the time', () => {
    expect(attempt({ status: 'paralysis', sleepTurns: 0 }, () => 0.1).acts).toBe(false)
    expect(attempt({ status: 'paralysis', sleepTurns: 0 }, () => 0.9).acts).toBe(true)
  })

  it('lets a burned or poisoned fighter move every turn', () => {
    expect(attempt({ status: 'burn', sleepTurns: 0 }, () => 0).acts).toBe(true)
    expect(attempt({ status: 'poison', sleepTurns: 0 }, () => 0).acts).toBe(true)
  })
})

describe('residual', () => {
  it('takes a sixteenth for a burn and an eighth for poison', () => {
    expect(residual('burn', 160)).toBe(10)
    expect(residual('poison', 160)).toBe(20)
  })

  it('always takes at least a point', () => {
    expect(residual('burn', 4)).toBe(1)
  })

  it('takes nothing for a condition that does not bite', () => {
    expect(residual('paralysis', 160)).toBe(0)
    expect(residual(null, 160)).toBe(0)
  })
})

describe('effectiveSpeed', () => {
  it('halves a paralysed fighter', () => {
    expect(effectiveSpeed(101, 'paralysis')).toBe(50)
  })

  it('leaves every other condition alone', () => {
    expect(effectiveSpeed(101, 'burn')).toBe(101)
    expect(effectiveSpeed(101, null)).toBe(101)
  })
})

describe('burnPenalty', () => {
  it('halves a physical move from a burned attacker', () => {
    expect(burnPenalty('burn', true)).toBe(0.5)
  })

  it('leaves a special move alone', () => {
    expect(burnPenalty('burn', false)).toBe(1)
  })

  it('leaves an unburned attacker alone', () => {
    expect(burnPenalty('poison', true)).toBe(1)
  })
})

describe('sleepFor', () => {
  it('stays inside one to three turns', () => {
    expect(sleepFor(() => 0)).toBe(1)
    expect(sleepFor(() => 0.999)).toBe(3)
  })
})
