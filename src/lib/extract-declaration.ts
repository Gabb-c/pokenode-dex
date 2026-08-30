/**
 * The declaration starting at `marker`, up to the line that closes it.
 *
 * Brackets are counted rather than matched by shape: a declaration built from a
 * call or an object closes on `})`, sometimes indented, so anchoring on a
 * column-zero `}` both clips that bracket and runs on into the next export.
 */
export function extractDeclaration(source: string, marker: string): string {
  const lines = source.split('\n')
  const start = lines.findIndex((line) => line.startsWith(marker))
  if (start === -1) return source.trim()

  // An arrow signature balances its own parentheses, so depth alone would stop
  // on the very first line; a trailing operator says the statement carries on.
  const continues = /(=>|[,([{])$/

  let depth = 0
  for (let end = start; end < lines.length; end++) {
    for (const character of lines[end]) {
      if ('([{'.includes(character)) depth++
      else if (')]}'.includes(character)) depth--
    }
    if (depth <= 0 && !continues.test(lines[end].trimEnd())) {
      return lines.slice(start, end + 1).join('\n')
    }
  }
  return lines.slice(start).join('\n')
}
