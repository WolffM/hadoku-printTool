import { describe, it, expect } from 'vitest'
import { calculateLayout, formatLayoutInfo } from './calculateLayout'

describe('calculateLayout', () => {
  it('returns null when tile is larger than paper', () => {
    expect(calculateLayout([20, 20], [8.5, 11])).toBeNull()
  })

  it('picks the orientation that fits more tiles', () => {
    // 5x7 cards on 11x17 paper:
    //   portrait paper 11x17, portrait tile 5x7 → 2x2 = 4
    //   portrait paper 11x17, landscape tile 7x5 → 1x3 = 3
    //   landscape paper 17x11, portrait tile 5x7 → 3x1 = 3
    //   landscape paper 17x11, landscape tile 7x5 → 2x2 = 4
    // Best = 4 tiles. Code prefers landscape paper when tied.
    const layout = calculateLayout([5, 7], [11, 17])
    expect(layout).not.toBeNull()
    expect(layout!.count).toBe(4)
    expect(layout!.cols * layout!.rows).toBe(4)
  })

  it('fits 5x7 onto Letter by trying all 4 orientations', () => {
    // Best option for 5x7 on 8.5x11 is 2 tiles:
    //   portrait paper 8.5x11, landscape tile 7x5: 1×2 = 2
    //   landscape paper 11x8.5, portrait tile 5x7: 2×1 = 2
    // Code prefers landscape paper when count is tied.
    const layout = calculateLayout([5, 7], [8.5, 11])
    expect(layout).not.toBeNull()
    expect(layout!.count).toBe(2)
  })

  it('fills 4x6 onto Letter portrait as 2x1 = 2 tiles', () => {
    // 4x6 onto 8.5x11:
    //   portrait paper, portrait tile: floor(8.5/4)=2, floor(11/6)=1 → 2
    //   portrait paper, landscape tile (6x4): floor(8.5/6)=1, floor(11/4)=2 → 2
    //   landscape paper (11x8.5), portrait tile: floor(11/4)=2, floor(8.5/6)=1 → 2
    //   landscape paper, landscape tile: floor(11/6)=1, floor(8.5/4)=2 → 2
    // All four layouts have count=2. Code defaults to landscape.
    const layout = calculateLayout([4, 6], [8.5, 11])
    expect(layout).not.toBeNull()
    expect(layout!.count).toBe(2)
  })

  it('respects sourceAspect to match orientation among equal-count layouts', () => {
    // Portrait source (aspect < 1) → tile should be portrait
    const portraitLayout = calculateLayout([4, 6], [8.5, 11], 0.7)
    expect(portraitLayout).not.toBeNull()
    expect(portraitLayout!.tileLandscape).toBe(false)

    // Landscape source (aspect > 1) → tile should be landscape
    const landscapeLayout = calculateLayout([4, 6], [8.5, 11], 1.5)
    expect(landscapeLayout).not.toBeNull()
    expect(landscapeLayout!.tileLandscape).toBe(true)
  })

  it('reports tile and paper dimensions for the chosen layout', () => {
    const layout = calculateLayout([5, 7], [11, 17])
    expect(layout!.tileW).toBeGreaterThan(0)
    expect(layout!.tileH).toBeGreaterThan(0)
    expect(layout!.paperW).toBeGreaterThan(0)
    expect(layout!.paperH).toBeGreaterThan(0)
  })
})

describe('formatLayoutInfo', () => {
  it('renders a human-readable layout summary', () => {
    const layout = calculateLayout([5, 7], [11, 17])!
    const formatted = formatLayoutInfo(layout)
    expect(formatted).toContain('copies')
    expect(formatted).toContain('grid')
    expect(formatted).toMatch(/landscape|portrait/)
  })
})
