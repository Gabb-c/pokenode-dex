/**
 * Asserts every colour pairing the design system promises.
 *
 * Values are read out of `src/styles/theme.css` rather than duplicated here, so
 * this fails when the tokens change and the contrast no longer holds.
 */
import { readFileSync } from 'node:fs'

const MINIMUM = 4.5
const THEME = new URL('../src/styles/theme.css', import.meta.url)

const srgbToLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const linToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)

function oklchToRgb(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(linToSrgb)
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((c) => srgbToLin(Math.min(1, Math.max(0, c))))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The token block for one theme: `:root { … }` is light, `.dark { … }` is dark. */
function tokens(css, selector) {
  const block = css.slice(css.indexOf(selector), css.indexOf('}', css.indexOf(selector)))
  const found = {}
  for (const [, name, L, C, H] of block.matchAll(
    /--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g,
  )) {
    found[name] = oklchToRgb(Number(L), Number(C), Number(H))
  }
  return found
}

const css = readFileSync(THEME, 'utf8')
const themes = { light: tokens(css, ':root {'), dark: tokens(css, '.dark {') }

const SURFACES = ['surface-0', 'surface-1', 'surface-2']
const failures = []
let checked = 0

for (const [theme, token] of Object.entries(themes)) {
  const foreground = Object.keys(token).filter(
    (name) => name.startsWith('type-') || ['ink-hi', 'ink-mid', 'ink-lo', 'accent'].includes(name),
  )

  for (const name of foreground) {
    for (const surface of SURFACES) {
      const ratio = contrast(token[name], token[surface])
      checked++
      if (ratio < MINIMUM) {
        failures.push(`${theme}: --${name} on --${surface} is ${ratio.toFixed(2)}:1`)
      }
    }
  }

  // Text sitting on the accent, which is a background in its own right.
  const onAccent = contrast(token['accent-ink'], token.accent)
  checked++
  if (onAccent < MINIMUM) {
    failures.push(`${theme}: --accent-ink on --accent is ${onAccent.toFixed(2)}:1`)
  }
}

if (failures.length > 0) {
  console.error(`${failures.length} of ${checked} pairings fall below ${MINIMUM}:1\n`)
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

console.log(`All ${checked} colour pairings clear ${MINIMUM}:1.`)
