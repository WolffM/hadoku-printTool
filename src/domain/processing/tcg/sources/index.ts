/**
 * CardSource registry.
 *
 * Adding a new TCG = create the source module, register it here, and add
 * the id to the TcgGame literal in `domain/types.ts`.
 */

import type { CardSource } from '../types'
import { mtgSource } from './mtg'
import { riftboundSource } from './riftbound'

export const SOURCES: Record<string, CardSource> = {
  mtg: mtgSource,
  riftbound: riftboundSource
}

/** Stable ordering for the Game dropdown UI. */
export const SOURCE_ORDER = ['mtg', 'riftbound'] as const

export type TcgGame = (typeof SOURCE_ORDER)[number]

export function getSource(game: TcgGame): CardSource {
  const source = SOURCES[game]
  if (!source) throw new Error(`Unknown TCG game "${game}". Known: ${SOURCE_ORDER.join(', ')}`)
  return source
}

export { mtgSource } from './mtg'
export { riftboundSource } from './riftbound'
