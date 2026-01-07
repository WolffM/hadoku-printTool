/**
 * Duplex Sheet Generation
 * Ported from Python printTool/src/core/image_ops.py
 *
 * Creates front and back sheets for duplex (double-sided) printing.
 * Handles auto-rotation when front/back images have different orientations.
 */

import type { LayoutInfo } from '../types'
import { TILE_GAP_INCHES } from '../constants'
import { imageToCanvas, resizeCanvas, calculateGridOffsets } from './canvasUtils'

/**
 * Rotate a canvas by 90 degrees counter-clockwise
 */
function rotateCanvas90CCW(source: HTMLCanvasElement): HTMLCanvasElement {
  const rotated = document.createElement('canvas')
  // Swap dimensions
  rotated.width = source.height
  rotated.height = source.width
  const ctx = rotated.getContext('2d')!

  // Rotate counter-clockwise: translate, rotate, draw
  ctx.translate(0, rotated.height)
  ctx.rotate(-Math.PI / 2)
  ctx.drawImage(source, 0, 0)

  return rotated
}

export interface DuplexSheetsResult {
  frontCanvas: HTMLCanvasElement
  backCanvas: HTMLCanvasElement
  wasRotated: boolean
}

export interface CreateDuplexSheetsOptions {
  /** Front image */
  frontImage: HTMLImageElement
  /** Back image */
  backImage: HTMLImageElement
  /** Layout information */
  layout: LayoutInfo
  /** Output DPI */
  dpi: number
}

/**
 * Create front and back sheets for duplex printing.
 *
 * Algorithm:
 * 1. Check if back image needs rotation (orientation mismatch)
 * 2. Create front sheet with tiles
 * 3. Create back sheet with tiles (mirrored horizontally for duplex alignment)
 *
 * Auto-rotation logic:
 * - If tile is portrait and back is landscape (or vice versa), rotate back -90°
 * - This ensures both sides have matching orientation
 */
export async function createDuplexSheets({
  frontImage,
  backImage,
  layout,
  dpi
}: CreateDuplexSheetsOptions): Promise<DuplexSheetsResult> {
  // Calculate pixel dimensions
  const tileWPx = Math.round(layout.tileW * dpi)
  const tileHPx = Math.round(layout.tileH * dpi)
  const paperWPx = Math.round(layout.paperW * dpi)
  const paperHPx = Math.round(layout.paperH * dpi)
  const gapPx = Math.round(TILE_GAP_INCHES * dpi)

  // Check if back image needs rotation
  const tileIsPortrait = layout.tileW < layout.tileH
  const backIsPortrait = backImage.naturalWidth < backImage.naturalHeight
  const needsRotation = tileIsPortrait !== backIsPortrait

  // Convert images to canvas
  const frontCanvas = imageToCanvas(frontImage)
  let backCanvas = imageToCanvas(backImage)

  // Rotate back if needed
  if (needsRotation) {
    backCanvas = rotateCanvas90CCW(backCanvas)
  }

  // Resize both to tile size
  const frontTile = await resizeCanvas(frontCanvas, tileWPx, tileHPx)
  const backTile = await resizeCanvas(backCanvas, tileWPx, tileHPx)

  // Create front output canvas
  const frontOutput = document.createElement('canvas')
  frontOutput.width = paperWPx
  frontOutput.height = paperHPx
  const frontCtx = frontOutput.getContext('2d')!

  // Fill with white
  frontCtx.fillStyle = 'white'
  frontCtx.fillRect(0, 0, paperWPx, paperHPx)

  // Create back output canvas
  const backOutput = document.createElement('canvas')
  backOutput.width = paperWPx
  backOutput.height = paperHPx
  const backCtx = backOutput.getContext('2d')!

  // Fill with white
  backCtx.fillStyle = 'white'
  backCtx.fillRect(0, 0, paperWPx, paperHPx)

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

  // Paste tiles at all positions
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      const x = xOffset + col * (tileWPx + gapPx)
      const y = yOffset + row * (tileHPx + gapPx)

      // Front: normal left-to-right
      frontCtx.drawImage(frontTile, x, y)

      // Back: mirrored column position for duplex alignment
      // When paper flips on long edge, col 0 aligns with col (cols-1)
      const mirroredCol = layout.cols - 1 - col
      const backX = xOffset + mirroredCol * (tileWPx + gapPx)
      backCtx.drawImage(backTile, backX, y)
    }
  }

  return {
    frontCanvas: frontOutput,
    backCanvas: backOutput,
    wasRotated: needsRotation
  }
}
