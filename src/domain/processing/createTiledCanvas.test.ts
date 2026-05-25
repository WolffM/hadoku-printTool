/**
 * Structural tests for the tiling pipeline.
 *
 * Pins behaviour before the canvasUtils consolidation refactor — these tests
 * will keep passing after createTiledCanvas is migrated to import from the
 * shared canvasUtils module.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { installCanvasMock } from '../../test-utils/canvasMock'

// Mock pica before importing the SUT (vi.mock is hoisted).
// Pica is called via `new Pica()` so the default export must be constructible.
vi.mock('pica', () => {
  class PicaMock {
    async resize(_src: HTMLCanvasElement, target: HTMLCanvasElement) {
      return target
    }
  }
  return { default: PicaMock }
})

import { createTiledCanvas } from './createTiledCanvas'
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
  // happy-dom lets us assign these directly
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true })
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true })
  return img
}

function makeLayout(overrides: Partial<LayoutInfo> = {}): LayoutInfo {
  return {
    cols: 2,
    rows: 2,
    count: 4,
    tileW: 5,
    tileH: 7,
    paperW: 11,
    paperH: 17,
    paperLandscape: false,
    tileLandscape: false,
    ...overrides
  }
}

describe('createTiledCanvas', () => {
  it('outputs a canvas sized paperW×paperH at the given DPI', async () => {
    const layout = makeLayout({ paperW: 11, paperH: 17 })
    const canvas = await createTiledCanvas({
      sourceImage: makeFakeImage(),
      layout,
      dpi: 300,
      position: 'All'
    })
    expect(canvas.width).toBe(11 * 300)
    expect(canvas.height).toBe(17 * 300)
  })

  it('draws one tile per grid slot when position="All"', async () => {
    const layout = makeLayout({ cols: 3, rows: 2, count: 6 })
    const canvas = await createTiledCanvas({
      sourceImage: makeFakeImage(),
      layout,
      dpi: 300,
      position: 'All'
    })
    const ctx = canvasMock.contextFor(canvas)
    expect(ctx).not.toBeNull()
    const drawCalls = ctx!.calls.filter(c => c.op === 'drawImage')
    expect(drawCalls.length).toBe(6) // one per cell
  })

  it('draws exactly one tile for a single-position layout', async () => {
    const layout = makeLayout({ cols: 2, rows: 2, count: 4 })
    const canvas = await createTiledCanvas({
      sourceImage: makeFakeImage(),
      layout,
      dpi: 300,
      position: 'Top-Left'
    })
    const ctx = canvasMock.contextFor(canvas)!
    const drawCalls = ctx.calls.filter(c => c.op === 'drawImage')
    expect(drawCalls.length).toBe(1)
  })

  it('fills the canvas with a white background before drawing', async () => {
    const layout = makeLayout()
    const canvas = await createTiledCanvas({
      sourceImage: makeFakeImage(),
      layout,
      dpi: 300,
      position: 'All'
    })
    const ctx = canvasMock.contextFor(canvas)!
    // First fillRect should cover the whole canvas
    const firstFill = ctx.calls.find(c => c.op === 'fillRect')
    expect(firstFill).toBeDefined()
    expect(firstFill!.pos).toEqual([0, 0])
    expect(firstFill!.size).toEqual([canvas.width, canvas.height])
  })

  it('positions are offset to center the grid on the page', async () => {
    const layout = makeLayout({ cols: 1, rows: 1, paperW: 10, paperH: 10, tileW: 4, tileH: 4 })
    const canvas = await createTiledCanvas({
      sourceImage: makeFakeImage(),
      layout,
      dpi: 100,
      position: 'All'
    })
    const ctx = canvasMock.contextFor(canvas)!
    const drawCall = ctx.calls.find(c => c.op === 'drawImage')!
    // 1×1 grid, 4×4 tile on 10×10 paper at 100 DPI = 1000×1000 px canvas, 400×400 tile
    // Centered: (1000-400)/2 = 300 for both x and y
    expect(drawCall.pos).toEqual([300, 300])
  })
})
