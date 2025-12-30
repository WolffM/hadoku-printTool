/**
 * Canvas Tiling Logic
 * Ported from Python printTool/src/core/image_ops.py:create_tiled_image
 *
 * Creates a tiled print-ready canvas with high-quality resizing.
 */

import Pica from 'pica'
import type { LayoutInfo, PositionOption } from '../types'
import { TILE_GAP_INCHES, POSITION_COORDS } from '../constants'

const pica = new Pica()

/**
 * Create a canvas from an HTMLImageElement
 */
function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!

  // Fill with white background first (handles alpha)
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw image on top
  ctx.drawImage(img, 0, 0)

  return canvas
}

/**
 * Resize a canvas using high-quality Lanczos resampling (via pica)
 */
async function resizeCanvas(
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): Promise<HTMLCanvasElement> {
  const target = document.createElement('canvas')
  target.width = targetWidth
  target.height = targetHeight

  // Fill with white background
  const ctx = target.getContext('2d')!
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, targetWidth, targetHeight)

  // Use pica for high-quality resizing
  await pica.resize(source, target, {
    unsharpAmount: 80,
    unsharpRadius: 0.6,
    unsharpThreshold: 2
  })

  return target
}

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

  // Calculate grid dimensions with gaps
  const gridWidth = tileWPx * layout.cols + gapPx * (layout.cols - 1)
  const gridHeight = tileHPx * layout.rows + gapPx * (layout.rows - 1)

  // Calculate centering offsets
  const xOffset = Math.round((paperWPx - gridWidth) / 2)
  const yOffset = Math.round((paperHPx - gridHeight) / 2)

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
