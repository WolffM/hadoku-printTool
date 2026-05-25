/**
 * Mode registry.
 *
 * Adding a new mode:
 *   1. Implement `ModeModule` in `<id>Mode.tsx`
 *   2. Add it to MODES below
 *   3. Add the corresponding PrintMode literal to `domain/types.ts`
 *
 * That's it — ModeSelector and App.tsx pick it up automatically.
 */

import type { ModeModule } from './types'
import type { PrintMode } from '../types'
import { simpleMode } from './simpleMode'
import { duplexMode } from './duplexMode'
import { calibrationMode } from './calibrationMode'
import { collageMode } from './collageMode'
import { tcgMode } from './tcgMode'
// (was `mtgMode`; renamed when the mode was generalised to support multiple TCGs)
import { stickerMode } from './stickerMode'

export const MODES: readonly ModeModule[] = [
  simpleMode,
  duplexMode,
  calibrationMode,
  collageMode,
  tcgMode,
  stickerMode
] as const

/** Resolve a ModeModule by id. Throws if id isn't registered. */
export function getMode(id: PrintMode): ModeModule {
  const mode = MODES.find(m => m.id === id)
  if (!mode) {
    throw new Error(`Unknown mode "${id}". Registered: ${MODES.map(m => m.id).join(', ')}`)
  }
  return mode
}
