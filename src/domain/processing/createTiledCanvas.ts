/**
 * Canvas Tiling Logic
 * Ported from Python printTool/src/core/image_ops.py:create_tiled_image
 *
 * Creates a tiled print-ready canvas with high-quality resizing.
 */

import type { LayoutInfo, PositionOption } from '../types'
import { TILE_GAP_INCHES, POSITION_COORDS } from '../constants'
import { imageToCanvas, resizeCanvas, createBlankSheet, calculateGridOffsets } from './canvasUtils'

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

  const coords = POSITION_COORDS[position]
  return coords ? [coords] : [[0, 0]]
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
 */
export async function createTiledCanvas({
  sourceImage,
  layout,
  dpi,
  position = 'All'
}: CreateTiledCanvasOptions): Promise<HTMLCanvasElement> {
  const tileWPx = Math.round(layout.tileW * dpi)
  const tileHPx = Math.round(layout.tileH * dpi)
  const paperWPx = Math.round(layout.paperW * dpi)
  const paperHPx = Math.round(layout.paperH * dpi)
  const gapPx = Math.round(TILE_GAP_INCHES * dpi)

  const tileCanvas = await resizeCanvas(imageToCanvas(sourceImage), tileWPx, tileHPx)

  const outputCanvas = createBlankSheet(paperWPx, paperHPx, 'white')
  const ctx = outputCanvas.getContext('2d')!

  const { xOffset, yOffset } = calculateGridOffsets(
    paperWPx,
    paperHPx,
    tileWPx,
    tileHPx,
    layout.rows,
    layout.cols,
    gapPx
  )

  for (const [row, col] of getPositions(layout, position)) {
    if (row < layout.rows && col < layout.cols) {
      const x = xOffset + col * (tileWPx + gapPx)
      const y = yOffset + row * (tileHPx + gapPx)
      ctx.drawImage(tileCanvas, x, y)
    }
  }

  return outputCanvas
}
