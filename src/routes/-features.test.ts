import { describe, expect, it } from 'vitest'
import { extractDeclaration } from '@/lib/extract-declaration'
import { FEATURES } from './-features'

/**
 * The page slices its snippets out of real source files by marker string, and
 * `extractDeclaration` falls back to the whole file when a marker is absent —
 * so a renamed or moved binding degrades into a silent wall of text rather
 * than an error. Asserting the snippet still opens with its own marker is what
 * turns that into a failing test.
 */
describe('about page snippets', () => {
  it.each(FEATURES.map((feature) => [feature.nav, feature] as const))(
    '%s still resolves to its declaration',
    (_nav, feature) => {
      const snippet = extractDeclaration(feature.source, feature.extract)

      expect(snippet.startsWith(feature.extract)).toBe(true)
      expect(snippet.length).toBeLessThan(feature.source.length)
    },
  )
})
