/** `#0025`. The dex is scanned as a column, so the width is fixed. */
export function dexNo(id: number): string {
  return `#${String(id).padStart(4, '0')}`
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

/** Flavor text arrives with hard line breaks and form feeds baked in. */
export function cleanFlavorText(text: string): string {
  return text.replace(/[\n\f\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
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
