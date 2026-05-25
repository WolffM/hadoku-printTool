/**
 * Structural tests for the MTG sheet compositor.
 *
 * Pins: 9 cards per sheet, pagination, back-sheet only when needed,
 * back-column mirroring for duplex alignment.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { installCanvasMock } from '../../../test-utils/canvasMock'

vi.mock('pica', () => {
  class PicaMock {
    async resize(_src: HTMLCanvasElement, target: HTMLCanvasElement) {
      return target
    }
  }
  return { default: PicaMock }
})

import { createMtgSheets } from './createMtgSheets'
import { MTG_PAGE_WIDTH_PX, MTG_PAGE_HEIGHT_PX, MTG_CARD_WIDTH_PX } from '../../constants'
import type { FetchedCard } from './scryfall'

let canvasMock: ReturnType<typeof installCanvasMock>

beforeAll(() => {
  canvasMock = installCanvasMock()
})

afterAll(() => {
  canvasMock.restore()
})

function fakeCard(opts: { withBack?: boolean } = {}): FetchedCard {
  const front = new Image()
  Object.defineProperty(front, 'naturalWidth', { value: 488, configurable: true })
  Object.defineProperty(front, 'naturalHeight', { value: 680, configurable: true })

  if (!opts.withBack) return { front }

  const back = new Image()
  Object.defineProperty(back, 'naturalWidth', { value: 488, configurable: true })
  Object.defineProperty(back, 'naturalHeight', { value: 680, configurable: true })
  return { front, back }
}

describe('createMtgSheets — pagination', () => {
  it('produces 0 sheets for empty input', async () => {
    const sheets = await createMtgSheets({ cards: [] })
    expect(sheets).toEqual([])
  })

  it('produces 1 sheet for 1 card', async () => {
    const sheets = await createMtgSheets({ cards: [fakeCard()] })
    expect(sheets).toHaveLength(1)
  })

  it('produces 1 sheet for 9 cards (exactly fills 3×3)', async () => {
    const cards = Array.from({ length: 9 }, () => fakeCard())
    const sheets = await createMtgSheets({ cards })
    expect(sheets).toHaveLength(1)
  })

  it('produces 2 sheets for 10 cards', async () => {
    const cards = Array.from({ length: 10 }, () => fakeCard())
    const sheets = await createMtgSheets({ cards })
    expect(sheets).toHaveLength(2)
  })

  it('produces 3 sheets for 19 cards (ceil(19/9))', async () => {
    const cards = Array.from({ length: 19 }, () => fakeCard())
    const sheets = await createMtgSheets({ cards })
    expect(sheets).toHaveLength(3)
  })
})

describe('createMtgSheets — sheet dimensions', () => {
  it('every front sheet is 2550 × 3300 (8.5" × 11" @ 300 DPI)', async () => {
    const cards = Array.from({ length: 12 }, () => fakeCard())
    const sheets = await createMtgSheets({ cards })
    for (const sheet of sheets) {
      expect(sheet.front.width).toBe(MTG_PAGE_WIDTH_PX)
      expect(sheet.front.height).toBe(MTG_PAGE_HEIGHT_PX)
    }
  })
})

describe('createMtgSheets — back faces', () => {
  it('omits the back sheet when no card has a back face', async () => {
    const sheets = await createMtgSheets({ cards: [fakeCard(), fakeCard()] })
    expect(sheets[0].back).toBeUndefined()
  })

  it('creates a back sheet when any card has a back face', async () => {
    const sheets = await createMtgSheets({
      cards: [fakeCard(), fakeCard({ withBack: true })]
    })
    expect(sheets[0].back).toBeDefined()
    expect(sheets[0].back!.width).toBe(MTG_PAGE_WIDTH_PX)
    expect(sheets[0].back!.height).toBe(MTG_PAGE_HEIGHT_PX)
  })

  it('mirrors back-sheet column positions left-to-right for duplex alignment', async () => {
    // 3 cards on row 0, all with backs:
    //   col 0 → front x=X0, back x=X2
    //   col 1 → front x=X1, back x=X1
    //   col 2 → front x=X2, back x=X0
    const sheets = await createMtgSheets({
      cards: [
        fakeCard({ withBack: true }),
        fakeCard({ withBack: true }),
        fakeCard({ withBack: true })
      ]
    })
    const front = sheets[0].front
    const back = sheets[0].back!

    const frontCtx = canvasMock.contextFor(front)!
    const backCtx = canvasMock.contextFor(back)!

    // Filter out tile-render fillRects + collect the X positions where card tiles were drawn onto the SHEET (not into the temp tile canvas).
    // The sheet's draw calls are drawImage onto a 2550×3300 canvas of card-sized tiles.
    const isSheetDraw = (c: { op: string; source?: { width: number; height: number } }) =>
      c.op === 'drawImage' && c.source?.width === MTG_CARD_WIDTH_PX

    const frontXs = frontCtx.calls.filter(isSheetDraw).map(c => c.pos[0])
    const backXs = backCtx.calls.filter(isSheetDraw).map(c => c.pos[0])

    expect(frontXs).toHaveLength(3)
    expect(backXs).toHaveLength(3)
    expect([...backXs].reverse()).toEqual(frontXs)
  })
})

describe('createMtgSheets — progress reporting', () => {
  it('invokes onProgress once per card placed', async () => {
    const cards = Array.from({ length: 5 }, () => fakeCard())
    const progress = vi.fn()
    await createMtgSheets({ cards, onProgress: progress })
    expect(progress).toHaveBeenCalledTimes(5)
    expect(progress).toHaveBeenLastCalledWith(5, 5)
  })
})
