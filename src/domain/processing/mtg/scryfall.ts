/**
 * Scryfall API Client
 * Ported from Python mtgProxies/main.py:fetch_card_image
 *
 * Mirrors the same fallback chain:
 *   1. Direct fetch by set + collector_number
 *   2. Fallback to name-based search
 *   3. Fallback to collector-number search
 *
 * Scryfall's API allows browser CORS, so calls happen client-side.
 */

import { logger } from '@wolffm/task-ui-components'
import { loadImage } from '../canvasUtils'
import type { MtgCardEntry } from './parseInput'

const SCRYFALL_BASE = 'https://api.scryfall.com/cards'

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

export interface FetchedCard {
  /** Front face image (always present on success) */
  front: HTMLImageElement
  /** Back face image — set for transform/MDFC/etc. */
  back?: HTMLImageElement
}

/** Pause between Scryfall requests (their guidelines: 50-100ms) */
const SCRYFALL_DELAY_MS = 100

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return null
    }
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * Load a remote Scryfall image. Resolves to null on error so the fallback
 * chain can move on instead of rejecting. crossOrigin='anonymous' lets the
 * canvas export without tainting.
 */
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

/**
 * Fetch a card from Scryfall with the same fallback chain as the Python tool.
 * Returns null if the card can't be resolved.
 */
export async function fetchCard(entry: MtgCardEntry): Promise<FetchedCard | null> {
  let data: ScryfallCard | null = null

  // 1) Direct fetch by set + collector number
  if (entry.setCode && entry.collectorNumber) {
    const url = `${SCRYFALL_BASE}/${entry.setCode.toLowerCase()}/${entry.collectorNumber}`
    data = await fetchJson<ScryfallCard>(url)
    await sleep(SCRYFALL_DELAY_MS)
  }

  // 2) Name-based search fallback
  if (!hasUsableImages(data) && entry.name) {
    const q = encodeURIComponent(entry.setCode ? `${entry.name} set:${entry.setCode}` : entry.name)
    const search = await fetchJson<ScryfallSearchResponse>(`${SCRYFALL_BASE}/search?q=${q}`)
    if (search?.data && search.data.length > 0) {
      data = search.data[0]
    }
    await sleep(SCRYFALL_DELAY_MS)
  }

  // 3) Collector-number search fallback
  if (!hasUsableImages(data) && entry.setCode && entry.collectorNumber) {
    const q = encodeURIComponent(`cn:${entry.collectorNumber} e:${entry.setCode.toLowerCase()}`)
    const search = await fetchJson<ScryfallSearchResponse>(`${SCRYFALL_BASE}/search?q=${q}`)
    if (search?.data && search.data.length > 0) {
      data = search.data[0]
    }
    await sleep(SCRYFALL_DELAY_MS)
  }

  if (!data) {
    logger.warn('[scryfall] Card not found', { raw: entry.raw })
    return null
  }

  // Multi-faced cards
  if (data.layout && MULTI_FACE_LAYOUTS.has(data.layout) && data.card_faces) {
    const frontUrl = pickImageUrl(data.card_faces[0]?.image_uris)
    const backUrl = pickImageUrl(data.card_faces[1]?.image_uris)
    const front = frontUrl ? await loadScryfallImage(frontUrl) : null
    const back = backUrl ? await loadScryfallImage(backUrl) : null
    if (!front) {
      logger.warn('[scryfall] Multi-faced card missing front image', { raw: entry.raw })
      return null
    }
    return back ? { front, back } : { front }
  }

  // Single-faced
  const singleUrl = pickImageUrl(data.image_uris)
  if (!singleUrl) {
    logger.warn('[scryfall] No image_uris on card', { raw: entry.raw })
    return null
  }
  const front = await loadScryfallImage(singleUrl)
  return front ? { front } : null
}

function hasUsableImages(data: ScryfallCard | null): boolean {
  if (!data) return false
  return Boolean(data.image_uris || data.card_faces)
}
