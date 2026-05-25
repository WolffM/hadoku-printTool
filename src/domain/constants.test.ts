import { describe, it, expect } from 'vitest'
import {
  STICKER_OFFSET_SIZES,
  MTG_PAGE_WIDTH_PX,
  MTG_PAGE_HEIGHT_PX,
  MTG_CARD_WIDTH_PX,
  MTG_CARD_HEIGHT_PX,
  MTG_CARDS_PER_ROW,
  MTG_CARDS_PER_COL,
  MTG_DPI,
  PAPER_SIZES,
  TILE_SIZES,
  VARIATION_PRESETS
} from './constants'

describe('MTG constants', () => {
  it('300 DPI × 8.5"×11" = 2550×3300 page', () => {
    expect(MTG_PAGE_WIDTH_PX).toBe(8.5 * MTG_DPI)
    expect(MTG_PAGE_HEIGHT_PX).toBe(11 * MTG_DPI)
  })

  it('300 DPI × 2.5"×3.5" = 750×1050 card', () => {
    expect(MTG_CARD_WIDTH_PX).toBe(2.5 * MTG_DPI)
    expect(MTG_CARD_HEIGHT_PX).toBe(3.5 * MTG_DPI)
  })

  it('a 3×3 card grid centers on the page with positive margins', () => {
    const gridWidth = MTG_CARD_WIDTH_PX * MTG_CARDS_PER_ROW
    const gridHeight = MTG_CARD_HEIGHT_PX * MTG_CARDS_PER_COL
    expect(MTG_PAGE_WIDTH_PX - gridWidth).toBeGreaterThanOrEqual(0)
    expect(MTG_PAGE_HEIGHT_PX - gridHeight).toBeGreaterThanOrEqual(0)
  })
})

describe('STICKER_OFFSET_SIZES', () => {
  it('mirrors the OFFSET_SIZES map from StickerMaker/main.py', () => {
    expect(STICKER_OFFSET_SIZES[1]).toBe(0.05)
    expect(STICKER_OFFSET_SIZES[2]).toBe(0.1)
    expect(STICKER_OFFSET_SIZES[3]).toBe(0.15)
    expect(STICKER_OFFSET_SIZES[4]).toBe(0.2)
  })
})

describe('PAPER_SIZES', () => {
  it('declares Letter and 11x17 in inches', () => {
    expect(PAPER_SIZES.Letter).toEqual([8.5, 11])
    expect(PAPER_SIZES['11x17']).toEqual([11, 17])
  })

  it('each paper entry is a [w, h] pair of positive numbers', () => {
    for (const [key, size] of Object.entries(PAPER_SIZES)) {
      expect(size.length, key).toBe(2)
      expect(size[0], key).toBeGreaterThan(0)
      expect(size[1], key).toBeGreaterThan(0)
    }
  })
})

describe('TILE_SIZES', () => {
  it('declares standard photo sizes', () => {
    expect(TILE_SIZES['5x7']).toEqual([5, 7])
    expect(TILE_SIZES['4x6']).toEqual([4, 6])
    expect(TILE_SIZES['8x10']).toEqual([8, 10])
  })
})

describe('VARIATION_PRESETS', () => {
  it('each preset has a Baseline as its first variation', () => {
    for (const [key, variations] of Object.entries(VARIATION_PRESETS)) {
      expect(variations[0].label, key).toMatch(/Baseline/i)
      expect(variations[0].args, key).toEqual([])
    }
  })

  it('all presets contain at least 8 variations (max 4×4 grid)', () => {
    for (const [key, variations] of Object.entries(VARIATION_PRESETS)) {
      expect(variations.length, key).toBeGreaterThanOrEqual(8)
    }
  })
})
