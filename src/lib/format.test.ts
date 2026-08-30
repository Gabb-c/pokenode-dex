import { describe, expect, it } from 'vitest'
import {
  cleanFlavorText,
  dexNo,
  effectiveness,
  generationLabel,
  humanize,
  kilograms,
  metres,
  padDexNo,
  tidyTrigger,
} from './format'

describe('dexNo', () => {
  it('pads to four digits so the column aligns', () => {
    expect(dexNo(25)).toBe('#0025')
    expect(dexNo(1025)).toBe('#1025')
  })

  it('does not truncate the five-digit ids the API gives alternate forms', () => {
    expect(dexNo(10001)).toBe('#10001')
  })

  it('exposes the bare padding the dex filter matches against', () => {
    expect(padDexNo(25)).toBe('0025')
    expect(padDexNo(10001)).toBe('10001')
  })
})

describe('unit conversion', () => {
  it('reads height as decimetres', () => {
    expect(metres(4)).toBe('0.4 m')
    expect(metres(14)).toBe('1.4 m')
  })

  it('reads weight as hectograms', () => {
    expect(kilograms(60)).toBe('6.0 kg')
    expect(kilograms(4600)).toBe('460.0 kg')
  })
})

describe('humanize', () => {
  it('titles each dash-separated word', () => {
    expect(humanize('deoxys-attack')).toBe('Deoxys Attack')
    expect(humanize('pikachu')).toBe('Pikachu')
  })
})

describe('generationLabel', () => {
  it('keeps the numeral a numeral', () => {
    expect(generationLabel('generation-i')).toBe('Gen I')
    expect(generationLabel('generation-viii')).toBe('Gen VIII')
  })
})

describe('tidyTrigger', () => {
  it('drops the verb when a condition already says it', () => {
    expect(tidyTrigger('level up, at level 16')).toBe('at level 16')
  })

  it('keeps the bare verb, which is the whole condition', () => {
    expect(tidyTrigger('level up')).toBe('level up')
  })

  it('leaves the triggers that are not level ups alone', () => {
    expect(tidyTrigger('trade: holding metal coat')).toBe('trade: holding metal coat')
  })
})

describe('cleanFlavorText', () => {
  it('unwraps the hard breaks and form feeds the API ships', () => {
    expect(cleanFlavorText('It can see\nthrough\fwalls.')).toBe('It can see through walls.')
  })

  it('collapses the double spaces that leaves behind', () => {
    expect(cleanFlavorText('A  b\n\nc ')).toBe('A b c')
  })

  it('rewrites the all-caps spelling the older games shipped', () => {
    expect(cleanFlavorText('This POKéMON sleeps.')).toBe('This Pokémon sleeps.')
    expect(cleanFlavorText('This POKEMON sleeps.')).toBe('This Pokémon sleeps.')
  })
})

describe('effectiveness', () => {
  it('writes the fractions as fractions', () => {
    expect(effectiveness(0.25)).toBe('¼')
    expect(effectiveness(0.5)).toBe('½')
    expect(effectiveness(0)).toBe('0')
    expect(effectiveness(4)).toBe('4')
  })
})
