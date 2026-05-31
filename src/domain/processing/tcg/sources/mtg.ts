/**
 * MTG CardSource — Scryfall API.
 *
 * Wraps the existing Scryfall fetcher + line parser into the generic
 * CardSource contract. Behaviour identical to the pre-refactor mtgMode:
 *   - Three-stage fallback: direct lookup → name search → cn search
 *   - Multi-face layouts (transform / MDFC / flip / split / reversible /
 *     double_faced_token) populate the back face
 *   - 100ms throttle between API calls (Scryfall's published guideline)
 *
 * Deck-list format:
 *   <name>, <set>, <collector#>     (set/collector# optional)
 *   <name>, <set>
 *   <name>
 *   https://scryfall.com/card/<set>/<collector#>/<...>
 *   <count> <line>                  (e.g. "3 Lightning Bolt, M10, 150")
 *   # comment                       (ignored)
 */

import { logger } from '@wolffm/logger/client'
import type { CardEntry, CardSource, FetchedCard } from '../types'
import { loadImage } from '../../canvasUtils'

const SCRYFALL_BASE = 'https://api.scryfall.com/cards'
const SCRYFALL_DELAY_MS = 100

/** Layouts where Scryfall puts art under card_faces[] */
const MULTI_FACE_LAYOUTS = new Set([
  'transform',
  'modal_dfc',
  'double_faced_token',
  'flip',
  'split',
  'reversible_card'
])

interface ScryfallImageUris {
  large?: string
  normal?: string
  png?: string
}
interface ScryfallCardFace {
  image_uris?: ScryfallImageUris
}
interface ScryfallCard {
  layout?: string
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallCardFace[]
}
interface ScryfallSearchResponse {
  data?: ScryfallCard[]
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function loadScryfallImage(url: string): Promise<HTMLImageElement | null> {
  try {
    return await loadImage(url, { crossOrigin: 'anonymous' })
  } catch {
    return null
  }
}

function pickImageUrl(uris?: ScryfallImageUris): string | undefined {
  return uris?.large || uris?.png || uris?.normal
}

function hasUsableImages(data: ScryfallCard | null): boolean {
  if (!data) return false
  return Boolean(data.image_uris || data.card_faces)
}

interface MtgEntryFields {
  url?: string
  name?: string
  setCode?: string
  collectorNumber?: string
}

type MtgEntry = CardEntry & MtgEntryFields

/**
 * Pull off an optional leading count: "3 Lightning Bolt" → [3, "Lightning Bolt"].
 * No prefix → count 1.
 */
function extractCount(line: string): { count: number; rest: string } {
  const m = /^(\d+)[xX]?\s+(.+)$/.exec(line)
  if (m) {
    return { count: Math.max(1, parseInt(m[1], 10)), rest: m[2].trim() }
  }
  return { count: 1, rest: line }
}

function parseLine(line: string): MtgEntry | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  const { count, rest } = extractCount(trimmed)

  // Scryfall URL
  if (/^https?:\/\//i.test(rest)) {
    const parts = rest.split('/')
    const collectorNumber = parts[parts.length - 2]
    const setCode = parts[parts.length - 3]
    return { raw: trimmed, count, url: rest, setCode, collectorNumber }
  }

  // Comma-separated: name, set, collector#
  const parts = rest.split(',').map(p => p.trim())
  return {
    raw: trimmed,
    count,
    name: parts[0] || undefined,
    setCode: parts[1] || undefined,
    collectorNumber: parts[2] || undefined
  }
}

async function fetchCard(entry: CardEntry): Promise<FetchedCard | null> {
  const e = entry as MtgEntry
  let data: ScryfallCard | null = null

  // 1. Direct fetch by set + collector#
  if (e.setCode && e.collectorNumber) {
    const url = `${SCRYFALL_BASE}/${e.setCode.toLowerCase()}/${e.collectorNumber}`
    data = await fetchJson<ScryfallCard>(url)
    await sleep(SCRYFALL_DELAY_MS)
  }

  // 2. Name search fallback
  if (!hasUsableImages(data) && e.name) {
    const q = encodeURIComponent(e.setCode ? `${e.name} set:${e.setCode}` : e.name)
    const search = await fetchJson<ScryfallSearchResponse>(`${SCRYFALL_BASE}/search?q=${q}`)
    if (search?.data && search.data.length > 0) data = search.data[0]
    await sleep(SCRYFALL_DELAY_MS)
  }

  // 3. Collector-number search fallback
  if (!hasUsableImages(data) && e.setCode && e.collectorNumber) {
    const q = encodeURIComponent(`cn:${e.collectorNumber} e:${e.setCode.toLowerCase()}`)
    const search = await fetchJson<ScryfallSearchResponse>(`${SCRYFALL_BASE}/search?q=${q}`)
    if (search?.data && search.data.length > 0) data = search.data[0]
    await sleep(SCRYFALL_DELAY_MS)
  }

  if (!data) {
    logger.warn('[mtg-source] Card not found', { raw: e.raw })
    return null
  }

  if (data.layout && MULTI_FACE_LAYOUTS.has(data.layout) && data.card_faces) {
    const frontUrl = pickImageUrl(data.card_faces[0]?.image_uris)
    const backUrl = pickImageUrl(data.card_faces[1]?.image_uris)
    const front = frontUrl ? await loadScryfallImage(frontUrl) : null
    const back = backUrl ? await loadScryfallImage(backUrl) : null
    if (!front) {
      logger.warn('[mtg-source] Multi-faced card missing front', { raw: e.raw })
      return null
    }
    return back ? { front, back } : { front }
  }

  const singleUrl = pickImageUrl(data.image_uris)
  if (!singleUrl) {
    logger.warn('[mtg-source] No image_uris on card', { raw: e.raw })
    return null
  }
  const front = await loadScryfallImage(singleUrl)
  return front ? { front } : null
}

export const mtgSource: CardSource = {
  id: 'mtg',
  label: 'Magic: The Gathering',
  cardWidthInches: 2.5,
  cardHeightInches: 3.5,
  cardsPerRow: 3,
  cardsPerCol: 3,
  inputHelp:
    'One card per line. Accepts a Scryfall URL or `name, set, collector#` (set / collector# optional). Optional leading count: `3 Lightning Bolt, M10, 150`.',
  placeholderExample: `Lightning Bolt, M10, 150
3 Sol Ring, c21, 263
https://scryfall.com/card/neo/238/...`,
  parseLine,
  fetchCard
}
