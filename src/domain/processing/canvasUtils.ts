/**
 * Canvas Utility Functions
 * Shared utilities for canvas manipulation used across processing modules.
 */

import Pica from 'pica'

const pica = new Pica()

/**
 * Create a canvas from an HTMLImageElement
 */
export function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
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
export async function resizeCanvas(
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
 * Calculate grid dimensions and centering offsets
 */
export function calculateGridOffsets(
  paperWPx: number,
  paperHPx: number,
  tileWPx: number,
  tileHPx: number,
  rows: number,
  cols: number,
  gapPx: number
): { xOffset: number; yOffset: number } {
  // Calculate grid dimensions with gaps
  const gridWidth = tileWPx * cols + gapPx * (cols - 1)
  const gridHeight = tileHPx * rows + gapPx * (rows - 1)

  // Calculate centering offsets
  const xOffset = Math.round((paperWPx - gridWidth) / 2)
  const yOffset = Math.round((paperHPx - gridHeight) / 2)

  return { xOffset, yOffset }
}
