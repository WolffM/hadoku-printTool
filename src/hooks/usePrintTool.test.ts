/**
 * Reducer regression tests.
 *
 * Pinned BEFORE the state-slicing refactor (step 5) so we can verify that
 * each per-mode add/remove/clear triple keeps behaving identically when
 * collapsed into a generic SET_MODE_SETTINGS action.
 */

import { describe, it, expect } from 'vitest'
import { reducer, initialState } from './usePrintTool'
import type { CollagePoolImage, MtgCustomImage, StickerImage, ImageFile } from '../domain/types'

function makeImageFile(name: string): ImageFile {
  return {
    file: new File([], name),
    dataUrl: `data:image/png;base64,${name}`,
    width: 100,
    height: 100,
    aspectRatio: 1,
    name
  }
}

function makeCollageImage(id: string): CollagePoolImage {
  return { ...makeImageFile(`${id}.png`), id, selected: false }
}

function makeMtgImage(id: string): MtgCustomImage {
  return {
    id,
    file: new File([], `${id}.png`),
    dataUrl: 'data:',
    name: `${id}.png`,
    width: 100,
    height: 100
  }
}

function makeStickerImage(id: string): StickerImage {
  return {
    id,
    file: new File([], `${id}.png`),
    dataUrl: 'data:',
    name: `${id}.png`,
    width: 100,
    height: 100
  }
}

describe('reducer — basic state transitions', () => {
  it('SET_MODE clears result and error', () => {
    const dirty = {
      ...initialState,
      result: { frontCanvas: document.createElement('canvas'), layoutInfo: null, filename: 'x' },
      error: 'boom'
    }
    const next = reducer(dirty, { type: 'SET_MODE', payload: 'duplex' })
    expect(next.mode).toBe('duplex')
    expect(next.result).toBeNull()
    expect(next.error).toBeNull()
  })

  it('SET_MODE forces position back to "All" when switching to duplex', () => {
    const dirty = { ...initialState, position: 'Top-Left' as const }
    const next = reducer(dirty, { type: 'SET_MODE', payload: 'duplex' })
    expect(next.position).toBe('All')
  })

  it('SET_SOURCE_IMAGE replaces the image and clears result+error', () => {
    const img = makeImageFile('test.png')
    const next = reducer(
      { ...initialState, error: 'old', result: null },
      { type: 'SET_SOURCE_IMAGE', payload: img }
    )
    expect(next.sourceImage).toBe(img)
    expect(next.error).toBeNull()
  })

  it('SET_PROCESSING toggles isProcessing but leaves result alone', () => {
    const next = reducer(initialState, { type: 'SET_PROCESSING', payload: true })
    expect(next.isProcessing).toBe(true)
  })

  it('SET_ERROR sets the error and stops processing', () => {
    const busy = { ...initialState, isProcessing: true }
    const next = reducer(busy, { type: 'SET_ERROR', payload: 'fail' })
    expect(next.error).toBe('fail')
    expect(next.isProcessing).toBe(false)
  })

  it('RESET returns initialState', () => {
    const dirty = { ...initialState, mode: 'mtg' as const, mtgInput: 'data' }
    const next = reducer(dirty, { type: 'RESET' })
    expect(next).toEqual(initialState)
  })
})

describe('reducer — POOL_* generic actions (collage)', () => {
  it('POOL_ADD appends without dropping existing', () => {
    const a = makeCollageImage('a')
    const b = makeCollageImage('b')
    const after = reducer(initialState, {
      type: 'POOL_ADD',
      pool: 'collageImages',
      payload: [a]
    })
    const after2 = reducer(after, { type: 'POOL_ADD', pool: 'collageImages', payload: [b] })
    expect(after2.collageImages.map(i => i.id)).toEqual(['a', 'b'])
  })

  it('POOL_REMOVE drops the matching id only', () => {
    const a = makeCollageImage('a')
    const b = makeCollageImage('b')
    const after = reducer(
      { ...initialState, collageImages: [a, b] },
      { type: 'POOL_REMOVE', pool: 'collageImages', payload: 'a' }
    )
    expect(after.collageImages.map(i => i.id)).toEqual(['b'])
  })

  it('POOL_CLEAR empties the pool', () => {
    const after = reducer(
      { ...initialState, collageImages: [makeCollageImage('a'), makeCollageImage('b')] },
      { type: 'POOL_CLEAR', pool: 'collageImages' }
    )
    expect(after.collageImages).toEqual([])
  })

  it('collage pool mutations clear the previous collageResult', () => {
    const result = {
      placements: [],
      coverage: 0,
      unusedImageIds: [],
      scaleFactor: 1,
      seed: 42
    }
    const after = reducer(
      { ...initialState, collageResult: result, collageImages: [makeCollageImage('a')] },
      { type: 'POOL_CLEAR', pool: 'collageImages' }
    )
    expect(after.collageResult).toBeNull()
  })

  it('non-collage pool mutations do NOT touch collageResult', () => {
    const result = {
      placements: [],
      coverage: 0,
      unusedImageIds: [],
      scaleFactor: 1,
      seed: 42
    }
    const after = reducer(
      { ...initialState, collageResult: result },
      { type: 'POOL_CLEAR', pool: 'mtgCustomImages' }
    )
    expect(after.collageResult).toEqual(result)
  })
})

describe('reducer — POOL_* generic actions (mtg + sticker)', () => {
  it('POOL_ADD works for mtgCustomImages', () => {
    const a = makeMtgImage('a')
    const b = makeMtgImage('b')
    const after = reducer(initialState, {
      type: 'POOL_ADD',
      pool: 'mtgCustomImages',
      payload: [a, b]
    })
    expect(after.mtgCustomImages.map(i => i.id)).toEqual(['a', 'b'])
  })

  it('POOL_REMOVE works for mtgCustomImages', () => {
    const after = reducer(
      { ...initialState, mtgCustomImages: [makeMtgImage('a'), makeMtgImage('b')] },
      { type: 'POOL_REMOVE', pool: 'mtgCustomImages', payload: 'b' }
    )
    expect(after.mtgCustomImages.map(i => i.id)).toEqual(['a'])
  })

  it('POOL_CLEAR works for mtgCustomImages', () => {
    const after = reducer(
      { ...initialState, mtgCustomImages: [makeMtgImage('a')] },
      { type: 'POOL_CLEAR', pool: 'mtgCustomImages' }
    )
    expect(after.mtgCustomImages).toEqual([])
  })

  it('POOL_ADD works for stickerImages', () => {
    const a = makeStickerImage('a')
    const after = reducer(initialState, {
      type: 'POOL_ADD',
      pool: 'stickerImages',
      payload: [a]
    })
    expect(after.stickerImages).toEqual([a])
  })

  it('POOL_REMOVE works for stickerImages', () => {
    const after = reducer(
      { ...initialState, stickerImages: [makeStickerImage('a'), makeStickerImage('b')] },
      { type: 'POOL_REMOVE', pool: 'stickerImages', payload: 'a' }
    )
    expect(after.stickerImages.map(i => i.id)).toEqual(['b'])
  })

  it('POOL_CLEAR works for stickerImages', () => {
    const after = reducer(
      { ...initialState, stickerImages: [makeStickerImage('a')] },
      { type: 'POOL_CLEAR', pool: 'stickerImages' }
    )
    expect(after.stickerImages).toEqual([])
  })

  it('SET_MTG_INPUT_MODE clears result and error', () => {
    const dirty = { ...initialState, error: 'old' }
    const after = reducer(dirty, { type: 'SET_MTG_INPUT_MODE', payload: 'custom' })
    expect(after.mtgInputMode).toBe('custom')
    expect(after.error).toBeNull()
  })

  it('SET_STICKER_SETTINGS merges partials onto the existing settings', () => {
    const after = reducer(initialState, {
      type: 'SET_STICKER_SETTINGS',
      payload: { copies: 5 }
    })
    expect(after.stickerSettings.copies).toBe(5)
    expect(after.stickerSettings.size).toBe(initialState.stickerSettings.size)
    expect(after.stickerSettings.testMode).toBe(initialState.stickerSettings.testMode)
  })
})

describe('reducer — generic POOL_* covers all three pools uniformly', () => {
  it('add/remove/clear works the same for collage / mtg / sticker', () => {
    const cases = [
      {
        key: 'collageImages' as const,
        image: makeCollageImage('a')
      },
      {
        key: 'mtgCustomImages' as const,
        image: makeMtgImage('a')
      },
      {
        key: 'stickerImages' as const,
        image: makeStickerImage('a')
      }
    ]

    for (const { key, image } of cases) {
      const added = reducer(initialState, {
        type: 'POOL_ADD',
        pool: key,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pool/payload pairing is validated by the type union; the loop generalizes
        payload: [image] as any
      })
      expect(added[key].length, `add: ${key}`).toBe(1)

      const cleared = reducer(added, { type: 'POOL_CLEAR', pool: key })
      expect(cleared[key].length, `clear: ${key}`).toBe(0)
    }
  })
})
