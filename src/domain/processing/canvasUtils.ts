/**
 * Canvas Utility Functions
 *
 * Single source of truth for canvas/image helpers used by every print mode.
 * Each helper does ONE thing — compose at the call site, don't add mode-specific
 * variants here.
 *
 * Why this file matters: before consolidation, `imageToCanvas`, `resizeCanvas`,
 * grid-centering math, and `new Pica()` instances were each duplicated 3-5×
 * across processing modules. New modes invariably copy the closest neighbour.
 * Adding the next variant here keeps all modes aligned.
 */

import Pica from 'pica'

/**
 * Shared pica instance — pica's worker pool is expensive to spin up and only
 * ever needs one across the whole app.
 */
const pica = new Pica()

// ============================================================================
// Image → Canvas helpers
// ============================================================================

/**
 * Render an `HTMLImageElement` onto a same-sized canvas, with an opaque white
 * background drawn first to flatten alpha.
 */
export function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)

  return canvas
}

/**
 * Load a data URL (or any image URL) into an HTMLImageElement.
 *
 * @param crossOrigin Set to `'anonymous'` for remote images that need to be
 *   readable from a canvas (Scryfall CDN, etc.) without tainting it.
 */
export function loadImage(
  src: string,
  options: { crossOrigin?: 'anonymous' | 'use-credentials' } = {}
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (options.crossOrigin) {
      img.crossOrigin = options.crossOrigin
    }
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 80)}`))
    img.src = src
  })
}

// ============================================================================
// Canvas creation helpers
// ============================================================================

/**
 * Allocate a new canvas of the given size, optionally filled with a colour.
 * `fill: null` leaves the canvas transparent.
 */
export function createBlankSheet(
  width: number,
  height: number,
  fill: string | null = 'white'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  if (fill !== null) {
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, width, height)
  }
  return canvas
}

/**
 * Rotate a canvas 90° counter-clockwise. Used by duplex when front/back
 * orientations don't match.
 */
export function rotateCanvas90CCW(source: HTMLCanvasElement): HTMLCanvasElement {
  const rotated = document.createElement('canvas')
  rotated.width = source.height
  rotated.height = source.width
  const ctx = rotated.getContext('2d')!
  ctx.translate(0, rotated.height)
  ctx.rotate(-Math.PI / 2)
  ctx.drawImage(source, 0, 0)
  return rotated
}

// ============================================================================
// Resize (Lanczos via pica)
// ============================================================================

/**
 * Resize a canvas with high-quality Lanczos resampling.
 * Target canvas is allocated for you; opaque-white background is pre-painted.
 */
export async function resizeCanvas(
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): Promise<HTMLCanvasElement> {
  const target = createBlankSheet(targetWidth, targetHeight, 'white')
  await pica.resize(source, target, {
    unsharpAmount: 80,
    unsharpRadius: 0.6,
    unsharpThreshold: 2
  })
  return target
}

/**
 * Resize variant that preserves transparency in the target (for cutout work).
 */
export async function resizeCanvasTransparent(
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): Promise<HTMLCanvasElement> {
  const target = createBlankSheet(targetWidth, targetHeight, null)
  await pica.resize(source, target, {
    quality: 3,
    alpha: true
  })
  return target
}

// ============================================================================
// Grid math
// ============================================================================

/**
 * Compute the top-left offset needed to centre an `rows × cols` grid of
 * `tileWPx × tileHPx` tiles (with `gapPx` between them) on a `paperWPx ×
 * paperHPx` canvas.
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
  const gridWidth = tileWPx * cols + gapPx * (cols - 1)
  const gridHeight = tileHPx * rows + gapPx * (rows - 1)
  return {
    xOffset: Math.round((paperWPx - gridWidth) / 2),
    yOffset: Math.round((paperHPx - gridHeight) / 2)
  }
}
