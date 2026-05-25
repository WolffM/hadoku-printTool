/**
 * Structural tests for the duplex pipeline.
 *
 * Critical property: back-sheet columns are mirrored horizontally so duplex
 * printing aligns front and back. This test pins that behaviour through
 * the canvasUtils consolidation refactor.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { installCanvasMock } from '../../test-utils/canvasMock'

vi.mock('pica', () => {
  class PicaMock {
    async resize(_src: HTMLCanvasElement, target: HTMLCanvasElement) {
      return target
    }
  }
  return { default: PicaMock }
})

import { createDuplexSheets } from './createDuplexSheets'
import type { LayoutInfo } from '../types'

let canvasMock: ReturnType<typeof installCanvasMock>

beforeAll(() => {
  canvasMock = installCanvasMock()
})

afterAll(() => {
  canvasMock.restore()
})

function makeFakeImage(width = 500, height = 700): HTMLImageElement {
  const img = new Image()
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true })
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true })
  return img
}

function makeLayout(overrides: Partial<LayoutInfo> = {}): LayoutInfo {
  return {
    cols: 3,
    rows: 2,
    count: 6,
    tileW: 3,
    tileH: 5,
    paperW: 11,
    paperH: 17,
    paperLandscape: false,
    tileLandscape: false,
    ...overrides
  }
}

describe('createDuplexSheets', () => {
  it('returns both front and back canvases', async () => {
    const result = await createDuplexSheets({
      frontImage: makeFakeImage(),
      backImage: makeFakeImage(),
      layout: makeLayout(),
      dpi: 300
    })
    expect(result.frontCanvas).toBeDefined()
    expect(result.backCanvas).toBeDefined()
  })

  it('front and back canvas dimensions match', async () => {
    const layout = makeLayout({ paperW: 11, paperH: 17 })
    const { frontCanvas, backCanvas } = await createDuplexSheets({
      frontImage: makeFakeImage(),
      backImage: makeFakeImage(),
      layout,
      dpi: 300
    })
    expect(frontCanvas.width).toBe(11 * 300)
    expect(frontCanvas.height).toBe(17 * 300)
    expect(backCanvas.width).toBe(frontCanvas.width)
    expect(backCanvas.height).toBe(frontCanvas.height)
  })

  it('back columns are mirrored — col i on front matches col (cols-1-i) on back', async () => {
    const layout = makeLayout({ cols: 3, rows: 1, tileW: 3, tileH: 5 })
    const { frontCanvas, backCanvas } = await createDuplexSheets({
      frontImage: makeFakeImage(),
      backImage: makeFakeImage(),
      layout,
      dpi: 100
    })

    const frontCtx = canvasMock.contextFor(frontCanvas)!
    const backCtx = canvasMock.contextFor(backCanvas)!

    const frontXs = frontCtx.calls.filter(c => c.op === 'drawImage').map(c => c.pos[0])
    const backXs = backCtx.calls.filter(c => c.op === 'drawImage').map(c => c.pos[0])

    expect(frontXs).toHaveLength(3)
    expect(backXs).toHaveLength(3)

    // Front: increasing x → Back: same x positions but reversed order
    expect([...backXs].reverse()).toEqual(frontXs)
  })

  it('marks wasRotated when front/back orientations differ', async () => {
    // tile is portrait (3×5), back image is landscape → needs rotation
    const result = await createDuplexSheets({
      frontImage: makeFakeImage(400, 600), // portrait
      backImage: makeFakeImage(800, 400), // landscape
      layout: makeLayout({ tileW: 3, tileH: 5 }),
      dpi: 300
    })
    expect(result.wasRotated).toBe(true)
  })

  it('does NOT mark wasRotated when orientations match', async () => {
    const result = await createDuplexSheets({
      frontImage: makeFakeImage(400, 600), // portrait
      backImage: makeFakeImage(400, 600), // portrait
      layout: makeLayout({ tileW: 3, tileH: 5 }), // portrait tile
      dpi: 300
    })
    expect(result.wasRotated).toBe(false)
  })
})
