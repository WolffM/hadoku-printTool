/**
 * MTG Input Parsing
 * Ported from Python mtgProxies/main.py (URL and CSV line parsing)
 */

export interface MtgCardEntry {
  /** Original raw line for diagnostics */
  raw: string
  /** Scryfall URL (set if line was a full URL) */
  url?: string
  /** Card name */
  name?: string
  /** Set code (e.g. "M10") */
  setCode?: string
  /** Collector number (e.g. "150") */
  collectorNumber?: string
}

/**
 * Parse one line of the MTG input list.
 *
 * Accepted formats (mirrors mtgProxies/main.py):
 *   - https://scryfall.com/card/<set>/<collector#>/<...>
 *   - <name>, <set>, <collector#>
 *   - <name>, <set>
 *   - <name>
 *
 * Returns null for empty/comment lines.
 */
export function parseMtgLine(line: string): MtgCardEntry | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) {
    return null
  }

  if (/^https?:\/\//i.test(trimmed)) {
    // Match Python: parts[-3] = set_code, parts[-2] = collector_number
    const parts = trimmed.split('/')
    const collectorNumber = parts[parts.length - 2]
    const setCode = parts[parts.length - 3]
    return { raw: trimmed, url: trimmed, setCode, collectorNumber }
  }

  const parts = trimmed.split(',').map(p => p.trim())
  return {
    raw: trimmed,
    name: parts[0] || undefined,
    setCode: parts[1] || undefined,
    collectorNumber: parts[2] || undefined
  }
}

/**
 * Parse a multi-line input string into a list of card entries.
 * Skips blank/comment lines.
 */
export function parseMtgInput(input: string): MtgCardEntry[] {
  return input
    .split(/\r?\n/)
    .map(parseMtgLine)
    .filter((entry): entry is MtgCardEntry => entry !== null)
}
