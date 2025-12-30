/**
 * Layout Calculation Algorithm
 * Ported from Python printTool/src/core/image_ops.py:calculate_tile_layout
 *
 * Calculates optimal tiling grid for placing tiles on a paper size.
 */

import type { LayoutInfo } from '../types'

/**
 * Calculate the optimal tile layout for a given paper and tile size.
 *
 * @param tileSize - [width, height] of a single tile in inches
 * @param paperSize - [width, height] of paper in inches
 * @param sourceAspect - Optional aspect ratio (width/height) of source image
 * @returns LayoutInfo or null if no valid layout exists
 */
export function calculateLayout(
  tileSize: readonly [number, number],
  paperSize: readonly [number, number],
  sourceAspect?: number
): LayoutInfo | null {
  const [tileW, tileH] = tileSize
  const [paperW, paperH] = paperSize

  const layouts: LayoutInfo[] = []

  // Try all 4 combinations: 2 paper orientations × 2 tile orientations
  for (const paperLandscape of [false, true]) {
    // Paper dimensions based on orientation
    const pw = paperLandscape ? paperH : paperW
    const ph = paperLandscape ? paperW : paperH

    for (const tileLandscape of [false, true]) {
      // Tile dimensions based on orientation
      const tw = tileLandscape ? tileH : tileW
      const th = tileLandscape ? tileW : tileH

      // Calculate how many tiles fit
      const cols = Math.floor(pw / tw)
      const rows = Math.floor(ph / th)
      const count = cols * rows

      if (count > 0) {
        layouts.push({
          cols,
          rows,
          count,
          tileW: tw,
          tileH: th,
          paperW: pw,
          paperH: ph,
          paperLandscape,
          tileLandscape
        })
      }
    }
  }

  // No valid layouts found
  if (layouts.length === 0) {
    return null
  }

  // Find maximum tile count
  const maxCount = Math.max(...layouts.map(l => l.count))
  const bestLayouts = layouts.filter(l => l.count === maxCount)

  // If multiple layouts have the same count, prefer one matching source orientation
  if (sourceAspect !== undefined && bestLayouts.length > 1) {
    const sourceIsLandscape = sourceAspect > 1.0
    const matchingLayout = bestLayouts.find(l => l.tileW > l.tileH === sourceIsLandscape)
    if (matchingLayout) {
      return matchingLayout
    }
  }

  // Default: prefer landscape paper orientation
  const landscapeLayout = bestLayouts.find(l => l.paperLandscape)
  return landscapeLayout ?? bestLayouts[0]
}

/**
 * Format layout info as a human-readable string
 */
export function formatLayoutInfo(layout: LayoutInfo): string {
  const paperOrientation = layout.paperW > layout.paperH ? 'landscape' : 'portrait'

  return `${layout.count} copies (${layout.cols}×${layout.rows} grid)\n${layout.tileW}×${layout.tileH}" cards on ${layout.paperW}×${layout.paperH}" paper (${paperOrientation})`
}
