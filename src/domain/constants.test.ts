import { describe, it, expect } from 'vitest'
import {
  STICKER_OFFSET_SIZES,
  TCG_PAGE_WIDTH_PX,
  TCG_PAGE_HEIGHT_PX,
  TCG_DPI,
  PAPER_SIZES,
  TILE_SIZES,
  VARIATION_PRESETS
} from './constants'
import { mtgSource } from './processing/tcg/sources/mtg'
import { riftboundSource } from './processing/tcg/sources/riftbound'

describe('TCG sheet constants', () => {
  it('300 DPI × 8.5"×11" = 2550×3300 page', () => {
    expect(TCG_PAGE_WIDTH_PX).toBe(8.5 * TCG_DPI)
    expect(TCG_PAGE_HEIGHT_PX).toBe(11 * TCG_DPI)
  })
})

describe('CardSource defaults', () => {
  it('MTG source is 2.5"×3.5" cards in a 3×3 grid', () => {
    expect(mtgSource.cardWidthInches).toBe(2.5)
    expect(mtgSource.cardHeightInches).toBe(3.5)
    expect(mtgSource.cardsPerRow).toBe(3)
    expect(mtgSource.cardsPerCol).toBe(3)
  })

  it('Riftbound source is 2.5"×3.5" cards in a 3×3 grid', () => {
    expect(riftboundSource.cardWidthInches).toBe(2.5)
    expect(riftboundSource.cardHeightInches).toBe(3.5)
    expect(riftboundSource.cardsPerRow).toBe(3)
    expect(riftboundSource.cardsPerCol).toBe(3)
  })

  it('the chosen grid fits inside the TCG sheet (positive margins)', () => {
    for (const source of [mtgSource, riftboundSource]) {
      const gridW = source.cardWidthInches * source.cardsPerRow * TCG_DPI
      const gridH = source.cardHeightInches * source.cardsPerCol * TCG_DPI
      expect(TCG_PAGE_WIDTH_PX - gridW, source.id).toBeGreaterThanOrEqual(0)
      expect(TCG_PAGE_HEIGHT_PX - gridH, source.id).toBeGreaterThanOrEqual(0)
    }
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
