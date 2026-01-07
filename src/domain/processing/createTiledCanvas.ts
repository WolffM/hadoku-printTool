/**
 * Canvas Tiling Logic
 * Ported from Python printTool/src/core/image_ops.py:create_tiled_image
 *
 * Creates a tiled print-ready canvas with high-quality resizing.
 */

import type { LayoutInfo, PositionOption } from '../types'
import { TILE_GAP_INCHES, POSITION_COORDS } from '../constants'
import { imageToCanvas, resizeCanvas, calculateGridOffsets } from './canvasUtils'

/**
 * Get positions to fill based on position option
 */
function getPositions(layout: LayoutInfo, position: PositionOption): [number, number][] {
  if (position === 'All') {
    const positions: [number, number][] = []
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) {
        positions.push([row, col])
      }
    }
    return positions
  }

  // Single position
  const coords = POSITION_COORDS[position]
  if (coords) {
    return [coords]
  }

  return [[0, 0]]
}

export interface CreateTiledCanvasOptions {
  /** Source image to tile */
  sourceImage: HTMLImageElement
  /** Layout information */
  layout: LayoutInfo
  /** Output DPI */
  dpi: number
  /** Position option: 'All' or specific position */
  position?: PositionOption
}

/**
 * Create a tiled canvas with the source image repeated in a grid pattern.
 *
 * Algorithm:
 * 1. Create canvas at paper dimensions (paperW × dpi, paperH × dpi)
 * 2. Fill with white background
 * 3. Resize source image to tile size using Lanczos (pica)
 * 4. Calculate gap (1/8 inch)
 * 5. Center grid on canvas
 * 6. Paste tiles at positions
 */
export async function createTiledCanvas({
  sourceImage,
  layout,
  dpi,
  position = 'All'
}: CreateTiledCanvasOptions): Promise<HTMLCanvasElement> {
  // Calculate pixel dimensions
  const tileWPx = Math.round(layout.tileW * dpi)
  const tileHPx = Math.round(layout.tileH * dpi)
  const paperWPx = Math.round(layout.paperW * dpi)
  const paperHPx = Math.round(layout.paperH * dpi)
  const gapPx = Math.round(TILE_GAP_INCHES * dpi)

  // Convert source image to canvas (handles alpha)
  const sourceCanvas = imageToCanvas(sourceImage)

  // Resize source to tile size
  const tileCanvas = await resizeCanvas(sourceCanvas, tileWPx, tileHPx)

  // Create output canvas
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = paperWPx
  outputCanvas.height = paperHPx
  const ctx = outputCanvas.getContext('2d')!

  // Fill with white background
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, paperWPx, paperHPx)

  // Calculate centering offsets
  const { xOffset, yOffset } = calculateGridOffsets(
    paperWPx,
    paperHPx,
    tileWPx,
    tileHPx,
    layout.rows,
    layout.cols,
    gapPx
  )

  // Get positions to fill
  const positions = getPositions(layout, position)

  // Paste tiles at each position
  for (const [row, col] of positions) {
    if (row < layout.rows && col < layout.cols) {
      const x = xOffset + col * (tileWPx + gapPx)
      const y = yOffset + row * (tileHPx + gapPx)
      ctx.drawImage(tileCanvas, x, y)
    }
  }

  return outputCanvas
}
