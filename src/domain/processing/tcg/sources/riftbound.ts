/**
 * Riftbound CardSource — cdn.piltoverarchive.com.
 *
 * URL pattern: https://cdn.piltoverarchive.com/cards/{SET}-{NUM}.webp
 *   - `{SET}` is the set code (OGN = Origins, UNL = Unleashed, ...)
 *   - `{NUM}` is a zero-padded 3-digit collector number
 *   - A `b` suffix on the file (e.g. OGN-007b.webp) is the back face for
 *     double-faced cards. ~4% of cards have one; the rest 404 on `-b`.
 *
 * CORS: `Access-Control-Allow-Origin: *` is set, images are hot-linkable
 * from any origin and exportable from a tainted-free canvas.
 *
 * Deck-list format (MVP — ID only; no name lookup):
 *   OGN-001
 *   3 OGN-007        ← count prefix supported
 *   3x OGN-007       ← also accepted
 *   # comment        ← ignored
 *
 * Future: bake a name → ID JSON index from piltoverarchive's /cards page so
 * we can accept name-based input. Skipped for now — IDs are what deck
 * exporters tend to spit out anyway.
 */

import { logger } from '@wolffm/task-ui-components'
import type { CardEntry, CardSource, FetchedCard } from '../types'
import { loadImage } from '../../canvasUtils'

const CDN_BASE = 'https://cdn.piltoverarchive.com/cards'

interface RiftboundEntryFields {
  setCode: string
  /** Zero-padded 3-digit collector number, e.g. "001". */
  collectorNumber: string
}

type RiftboundEntry = CardEntry & RiftboundEntryFields

/** Matches "OGN-001", "OGN-007a", "OGN-007b", etc. Capture the set + number (sans suffix). */
const ID_PATTERN = /^([A-Za-z]{2,5})-(\d{1,4})(?:[a-z])?$/

function extractCount(line: string): { count: number; rest: string } {
  const m = /^(\d+)[xX]?\s+(.+)$/.exec(line)
  if (m) return { count: Math.max(1, parseInt(m[1], 10)), rest: m[2].trim() }
  return { count: 1, rest: line }
}

function parseLine(line: string): RiftboundEntry | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  const { count, rest } = extractCount(trimmed)
  const m = ID_PATTERN.exec(rest)
  if (!m) return null

  const setCode = m[1].toUpperCase()
  // Normalise to 3-digit padding to match the CDN's filename convention.
  const collectorNumber = m[2].padStart(3, '0')
  return { raw: trimmed, count, setCode, collectorNumber }
}

function frontUrl(setCode: string, num: string): string {
  return `${CDN_BASE}/${setCode}-${num}.webp`
}

function backUrl(setCode: string, num: string): string {
  return `${CDN_BASE}/${setCode}-${num}b.webp`
}

async function tryLoad(url: string): Promise<HTMLImageElement | null> {
  try {
    return await loadImage(url, { crossOrigin: 'anonymous' })
  } catch {
    return null
  }
}

async function fetchCard(entry: CardEntry): Promise<FetchedCard | null> {
  const e = entry as RiftboundEntry
  // Probe front + back in parallel. Most cards 404 on back, costing only the
  // CDN round-trip in parallel with the front load (no user-visible delay).
  const [front, back] = await Promise.all([
    tryLoad(frontUrl(e.setCode, e.collectorNumber)),
    tryLoad(backUrl(e.setCode, e.collectorNumber))
  ])
  if (!front) {
    logger.warn('[riftbound-source] Card not found', {
      raw: e.raw,
      tried: frontUrl(e.setCode, e.collectorNumber)
    })
    return null
  }
  return back ? { front, back } : { front }
}

export const riftboundSource: CardSource = {
  id: 'riftbound',
  label: 'Riftbound',
  // Same physical dimensions as MTG until proven otherwise (most TCGs use
  // standard poker sized cards). Update here if Riftbound's spec differs.
  cardWidthInches: 2.5,
  cardHeightInches: 3.5,
  cardsPerRow: 3,
  cardsPerCol: 3,
  inputHelp:
    'One card per line as `SET-NUM` (e.g. `OGN-007`). Sets currently published on the CDN: OGN (Origins), UNL (Unleashed). Optional leading count: `3 OGN-007`.',
  placeholderExample: `OGN-001
3 OGN-007
UNL-015`,
  parseLine,
  fetchCard
}
