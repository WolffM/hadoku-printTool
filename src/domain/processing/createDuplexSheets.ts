/**
 * Duplex Sheet Generation
 * Ported from Python printTool/src/core/image_ops.py
 *
 * Creates front and back sheets for duplex (double-sided) printing.
 * Auto-rotates the back image when front/back orientations differ so both
 * sides match. Mirrors back-sheet columns left-to-right so cards align when
 * the page is flipped on its long edge.
 */

import type { LayoutInfo } from '../types'
import { TILE_GAP_INCHES } from '../constants'
import {
  imageToCanvas,
  resizeCanvas,
  rotateCanvas90CCW,
  createBlankSheet,
  calculateGridOffsets
} from './canvasUtils'

export interface DuplexSheetsResult {
  frontCanvas: HTMLCanvasElement
  backCanvas: HTMLCanvasElement
  wasRotated: boolean
}

export interface CreateDuplexSheetsOptions {
  frontImage: HTMLImageElement
  backImage: HTMLImageElement
  layout: LayoutInfo
  dpi: number
}

export async function createDuplexSheets({
  frontImage,
  backImage,
  layout,
  dpi
}: CreateDuplexSheetsOptions): Promise<DuplexSheetsResult> {
  const tileWPx = Math.round(layout.tileW * dpi)
  const tileHPx = Math.round(layout.tileH * dpi)
  const paperWPx = Math.round(layout.paperW * dpi)
  const paperHPx = Math.round(layout.paperH * dpi)
  const gapPx = Math.round(TILE_GAP_INCHES * dpi)

  // Detect orientation mismatch
  const tileIsPortrait = layout.tileW < layout.tileH
  const backIsPortrait = backImage.naturalWidth < backImage.naturalHeight
  const needsRotation = tileIsPortrait !== backIsPortrait

  const frontCanvas = imageToCanvas(frontImage)
  let backCanvas = imageToCanvas(backImage)
  if (needsRotation) {
    backCanvas = rotateCanvas90CCW(backCanvas)
  }

  const [frontTile, backTile] = await Promise.all([
    resizeCanvas(frontCanvas, tileWPx, tileHPx),
    resizeCanvas(backCanvas, tileWPx, tileHPx)
  ])

  const frontOutput = createBlankSheet(paperWPx, paperHPx, 'white')
  const backOutput = createBlankSheet(paperWPx, paperHPx, 'white')
  const frontCtx = frontOutput.getContext('2d')!
  const backCtx = backOutput.getContext('2d')!

  const { xOffset, yOffset } = calculateGridOffsets(
    paperWPx,
    paperHPx,
    tileWPx,
    tileHPx,
    layout.rows,
    layout.cols,
    gapPx
  )

  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      const x = xOffset + col * (tileWPx + gapPx)
      const y = yOffset + row * (tileHPx + gapPx)

      // Front: normal left-to-right
      frontCtx.drawImage(frontTile, x, y)

      // Back: mirrored column position for duplex alignment
      // (paper flips on long edge, so col 0 aligns with col (cols-1))
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
