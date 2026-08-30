import { describe, expect, it } from 'vitest'
import { extractDeclaration } from './extract-declaration'

const brackets = (text: string) => {
  let depth = 0
  for (const character of text) {
    if ('([{'.includes(character)) depth++
    else if (')]}'.includes(character)) depth--
  }
  return depth
}

describe('extractDeclaration', () => {
  it('keeps the closing bracket of a call, not just its brace', () => {
    const source = ['export const api = new Client({', '  cache: false,', '})', '', 'const after = 1'].join('\n')
    const out = extractDeclaration(source, 'export const api')

    expect(out.endsWith('})')).toBe(true)
    expect(out).not.toContain('after')
  })

  it('does not stop on an arrow signature that balances its own parentheses', () => {
    const source = [
      'export const q = (name: string) =>',
      '  options({',
      '    key: [name],',
      '  })',
      '',
      'export const other = 1',
    ].join('\n')
    const out = extractDeclaration(source, 'export const q')

    expect(out.split('\n')).toHaveLength(4)
    expect(out).not.toContain('other')
    expect(brackets(out)).toBe(0)
  })

  it('stops at the end of a function rather than running into the next export', () => {
    const source = [
      'export function first() {',
      '  return 1',
      '}',
      '',
      'export function second() {',
      '  return 2',
      '}',
    ].join('\n')
    const out = extractDeclaration(source, 'export function first')

    expect(out).toContain('return 1')
    expect(out).not.toContain('second')
  })

  it('handles a declaration with no brackets at all', () => {
    const source = ['export const TTL = 1000', 'export const other = 2'].join('\n')
    expect(extractDeclaration(source, 'export const TTL')).toBe('export const TTL = 1000')
  })

  it('falls back to the whole file when the marker is absent', () => {
    expect(extractDeclaration('const a = 1', 'export const missing')).toBe('const a = 1')
  })
})
