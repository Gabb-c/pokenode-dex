import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BATTLE_TYPES, typeVar } from './types'

/**
 * Guards the seam between the code and the stylesheet.
 *
 * `typeVar` hands a `var()` reference to an inline style, so a token that is not
 * actually emitted fails silently — the colour simply never appears. Tailwind
 * only materialises an `@theme inline` variable when a utility references it,
 * which is exactly how that happened once already.
 */
const theme = readFileSync(new URL('../styles/theme.css', import.meta.url), 'utf8')

/** The custom properties declared inside one block of the stylesheet. */
const declared = (opener: string) => {
  const start = theme.indexOf(opener)
  if (start === -1) throw new Error(`No ${opener} block in theme.css`)
  const body = theme.slice(start + opener.length, theme.indexOf('\n}', start))
  return new Set([...body.matchAll(/(--[\w-]+):/g)].map(([, name]) => name))
}

const light = declared(':root {')
const dark = declared('.dark {')
const staticTokens = declared('@theme {')
/**
 * Aliases, not tokens. Tailwind emits one only when a utility class references
 * it, so hand-written CSS must never point at these.
 */
const aliases = declared('@theme inline {')

describe('hand-written CSS', () => {
  it('references only tokens both themes declare, never a tree-shaken alias', () => {
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
    // Skip --t and --fill: those are set per element by the components.
    const local = new Set(['--t', '--fill'])
    const referenced = [...css.matchAll(/var\((--[\w-]+)\)/g)]
      .map(([, name]) => name)
      .filter((name) => !local.has(name))

    for (const token of new Set(referenced)) {
      expect(aliases, `${token} is a tree-shakeable @theme inline alias`).not.toContain(token)
      if (staticTokens.has(token)) continue
      expect(light, `${token} missing from :root`).toContain(token)
      expect(dark, `${token} missing from .dark`).toContain(token)
    }
  })
})

describe('typeVar', () => {
  it('names a token that both themes actually declare', () => {
    for (const name of BATTLE_TYPES) {
      const token = typeVar(name).slice('var('.length, -1)
      expect(light, `${name} missing from :root`).toContain(token)
      expect(dark, `${name} missing from .dark`).toContain(token)
    }
  })

  it('falls back to a declared token for anything that is not a battle type', () => {
    const token = typeVar('shadow').slice('var('.length, -1)
    expect(light).toContain(token)
    expect(dark).toContain(token)
  })

  it('does not reach for the @theme inline aliases, which are not emitted', () => {
    expect(typeVar('fire')).not.toContain('--color-')
  })
})
