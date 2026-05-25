/**
 * TCG (Trading Card Game) proxy mode — shared types.
 *
 * The mode is game-agnostic. Per-game logic lives in a CardSource plugin:
 *   - parses one deck-list line into an entry
 *   - fetches the card's front (and optional back) images
 *   - declares the card's physical dimensions + grid layout
 *
 * Current sources: `mtg` (Scryfall), `riftbound` (cdn.piltoverarchive.com).
 * Adding another TCG = drop a CardSource into sources/ and register it.
 */

import type { ReactNode } from 'react'

/** A line from the deck list, parsed but not yet fetched. */
export interface CardEntry {
  /** Original line for diagnostics ("Failed to fetch: X"). */
  raw: string
  /** Quantity multiplier (default 1; "3 OGN-007" → 3). */
  count: number
  /** Source-specific fields. Each CardSource reads its own keys. */
  [key: string]: unknown
}

export interface FetchedCard {
  front: HTMLImageElement
  /** Set for transform / MDFC / similar. Back sheet is omitted when absent. */
  back?: HTMLImageElement
}

export interface CardSource {
  id: string
  label: string
  /** Card physical width/height in inches. Drives canvas sizing. */
  cardWidthInches: number
  cardHeightInches: number
  /** Number of card slots per row × col on a single sheet. */
  cardsPerRow: number
  cardsPerCol: number
  /** Help text shown below the textarea heading. */
  inputHelp: ReactNode
  /** Multi-line placeholder example for the textarea. */
  placeholderExample: string
  /**
   * Parse one deck-list line into an entry. Return null for blank/comment
   * lines. May throw on malformed lines (caller catches and logs).
   */
  parseLine(line: string): CardEntry | null
  /**
   * Fetch the front (+ optional back) images for one entry.
   * Resolve to null if the card can't be resolved (logged + skipped, not fatal).
   */
  fetchCard(entry: CardEntry): Promise<FetchedCard | null>
}

/** Parse a full deck-list textarea against a source. */
export function parseDeckList(text: string, source: CardSource): CardEntry[] {
  const out: CardEntry[] = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    try {
      const entry = source.parseLine(trimmed)
      if (entry) out.push(entry)
    } catch {
      // Caller can flag malformed lines after the fact; one bad line shouldn't
      // poison the whole list.
    }
  }
  return out
}

/** Expand entries by their count (3× Lightning Bolt → 3 entries). */
export function expandByCount(entries: CardEntry[]): CardEntry[] {
  const out: CardEntry[] = []
  for (const entry of entries) {
    const n = Math.max(1, Math.floor(entry.count))
    for (let i = 0; i < n; i++) out.push(entry)
  }
  return out
}
