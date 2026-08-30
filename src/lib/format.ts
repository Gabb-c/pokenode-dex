/** `0025`. Precomputed per entry for the dex filter, which matches against it. */
export function padDexNo(id: number): string {
  return String(id).padStart(4, '0')
}

/** `#0025`. The dex is scanned as a column, so the width is fixed. */
export function dexNo(id: number): string {
  return `#${padDexNo(id)}`
}

/** The API reports height in decimetres. */
export function metres(decimetres: number): string {
  return `${(decimetres / 10).toFixed(1)} m`
}

/** The API reports weight in hectograms. */
export function kilograms(hectograms: number): string {
  return `${(hectograms / 10).toFixed(1)} kg`
}

/** `deoxys-speed` → `Deoxys Speed`. Only for resources with no localized name. */
export function humanize(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * `generation-iii` → `Gen III`.
 *
 * Its own function rather than a rule inside `humanize`: the numeral has to be
 * uppercased whole, and a species named `mr-mime` must not be.
 */
export function generationLabel(slug: string): string {
  return `Gen ${slug.replace('generation-', '').toUpperCase()}`
}

/**
 * The library formats a trigger as `level up, at level 16`, which says the same
 * thing twice. The bare `level up` — an evolution with no further condition —
 * still needs its verb.
 */
export function tidyTrigger(text: string): string {
  return text.replace(/^level up, /, '')
}

/**
 * Flavor text arrives with hard line breaks and form feeds baked in, and with
 * the all-caps `POKéMON` the older games shipped.
 */
export function cleanFlavorText(text: string): string {
  return text
    .replace(/[\n\f\r]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/POK[EÉé]MON/g, 'Pokémon')
    .trim()
}

const multipliers = new Map([
  [0, '0'],
  [0.25, '¼'],
  [0.5, '½'],
  [1, '1'],
  [2, '2'],
  [4, '4'],
])

export function effectiveness(multiplier: number): string {
  return multipliers.get(multiplier) ?? `${multiplier}`
}
