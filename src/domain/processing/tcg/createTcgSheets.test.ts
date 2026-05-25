/**
 * Structural tests for the TCG sheet compositor.
 *
 * Pins: pagination at cardsPerSheet, back-sheet only when needed, back-column
 * mirroring for duplex alignment, sheet dimensions match the global TCG page
 * size. Exercised against both bundled sources (MTG, Riftbound) since their
 * dimensions happen to match — if a future source uses different dims, the
 * test parametrization stays correct.
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

import { createTcgSheets } from './createTcgSheets'
import { TCG_PAGE_WIDTH_PX, TCG_PAGE_HEIGHT_PX, TCG_DPI } from '../../constants'
import { mtgSource, riftboundSource } from './sources'
import type { FetchedCard, CardSource } from './types'

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

const sourcesUnderTest: CardSource[] = [mtgSource, riftboundSource]

describe('createTcgSheets — pagination (per source)', () => {
  for (const source of sourcesUnderTest) {
    const cardsPerSheet = source.cardsPerRow * source.cardsPerCol

    it(`[${source.id}] 0 sheets for empty input`, async () => {
      expect(await createTcgSheets({ source, cards: [] })).toEqual([])
    })

    it(`[${source.id}] 1 sheet for 1 card`, async () => {
      const sheets = await createTcgSheets({ source, cards: [fakeCard()] })
      expect(sheets).toHaveLength(1)
    })

    it(`[${source.id}] 1 sheet for ${cardsPerSheet} cards (exact fit)`, async () => {
      const cards = Array.from({ length: cardsPerSheet }, () => fakeCard())
      const sheets = await createTcgSheets({ source, cards })
      expect(sheets).toHaveLength(1)
    })

    it(`[${source.id}] 2 sheets for ${cardsPerSheet + 1} cards`, async () => {
      const cards = Array.from({ length: cardsPerSheet + 1 }, () => fakeCard())
      const sheets = await createTcgSheets({ source, cards })
      expect(sheets).toHaveLength(2)
    })
  }
})

describe('createTcgSheets — sheet dimensions', () => {
  it('every front sheet is 2550 × 3300 (8.5" × 11" @ 300 DPI)', async () => {
    const cards = Array.from({ length: 12 }, () => fakeCard())
    const sheets = await createTcgSheets({ source: mtgSource, cards })
    for (const sheet of sheets) {
      expect(sheet.front.width).toBe(TCG_PAGE_WIDTH_PX)
      expect(sheet.front.height).toBe(TCG_PAGE_HEIGHT_PX)
    }
  })
})

describe('createTcgSheets — back faces', () => {
  it('omits the back sheet when no card has a back face', async () => {
    const sheets = await createTcgSheets({
      source: mtgSource,
      cards: [fakeCard(), fakeCard()]
    })
    expect(sheets[0].back).toBeUndefined()
  })

  it('creates a back sheet when any card has a back face', async () => {
    const sheets = await createTcgSheets({
      source: mtgSource,
      cards: [fakeCard(), fakeCard({ withBack: true })]
    })
    expect(sheets[0].back).toBeDefined()
    expect(sheets[0].back?.width).toBe(TCG_PAGE_WIDTH_PX)
    expect(sheets[0].back?.height).toBe(TCG_PAGE_HEIGHT_PX)
  })

  it('mirrors back-sheet columns for duplex alignment', async () => {
    // 3 cards in row 0, all with backs. front col 0 → back col 2, col 1 → 1, col 2 → 0.
    const sheets = await createTcgSheets({
      source: mtgSource,
      cards: [
        fakeCard({ withBack: true }),
        fakeCard({ withBack: true }),
        fakeCard({ withBack: true })
      ]
    })
    const frontCtx = canvasMock.contextFor(sheets[0].front)!
    const backCtx = canvasMock.contextFor(sheets[0].back!)!
    const cardWidthPx = Math.round(mtgSource.cardWidthInches * TCG_DPI)
    const isSheetDraw = (c: { op: string; source?: { width: number; height: number } }) =>
      c.op === 'drawImage' && c.source?.width === cardWidthPx
    const frontXs = frontCtx.calls.filter(isSheetDraw).map(c => c.pos[0])
    const backXs = backCtx.calls.filter(isSheetDraw).map(c => c.pos[0])
    expect(frontXs).toHaveLength(3)
    expect(backXs).toHaveLength(3)
    expect([...backXs].reverse()).toEqual(frontXs)
  })
})

describe('createTcgSheets — progress reporting', () => {
  it('invokes onProgress once per card placed', async () => {
    const cards = Array.from({ length: 5 }, () => fakeCard())
    const progress = vi.fn()
    await createTcgSheets({ source: mtgSource, cards, onProgress: progress })
    expect(progress).toHaveBeenCalledTimes(5)
    expect(progress).toHaveBeenLastCalledWith(5, 5)
  })
})
