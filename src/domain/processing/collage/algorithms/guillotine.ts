/**
 * Guillotine Bin Packing Algorithm
 *
 * A bin packing algorithm that uses "guillotine cuts":
 * 1. Start with the full page as a free rectangle
 * 2. For each image, find the best-fitting free rectangle
 * 3. After placing an image, split the remaining space with a horizontal or vertical cut
 * 4. Best space efficiency for mixed sizes
 *
 * NO ROTATION - images maintain their original orientation
 */

import type {
  AlgorithmInput,
  AlgorithmOutput,
  PlacedImage,
  ImageDimensions,
  FreeRect
} from '../types'
import { SeededRandom, biasedShuffleByArea } from '../randomization'
import { filterValidImages, calculateCoverage, createEmptyOutput } from '../utils'

interface ScoredRect {
  rect: FreeRect
  score: number
}

export function guillotineAlgorithm(input: AlgorithmInput): AlgorithmOutput {
  const { images, pageWidth, pageHeight, gapInches, minImageSizeInches, seed } = input
  const rng = new SeededRandom(seed)

  // Filter out images that are too small
  const validImages = filterValidImages(images, minImageSizeInches)

  if (validImages.length === 0) {
    return createEmptyOutput(images)
  }

  // Sort with biased shuffle - larger images first with randomness
  const sortedImages = biasedShuffleByArea(validImages, rng, 0.75)

  // Initialize free rectangles with the full page (no margin - gap is between images only)
  const freeRects: FreeRect[] = [{ x: 0, y: 0, width: pageWidth, height: pageHeight }]

  const placements: PlacedImage[] = []
  const unusedImageIds: string[] = []

  for (const img of sortedImages) {
    const placement = placeImage(img, freeRects, gapInches, rng)
    if (placement) {
      placements.push(placement)
    } else {
      unusedImageIds.push(img.id)
    }
  }

  return {
    placements,
    coverage: calculateCoverage(placements, pageWidth, pageHeight),
    unusedImageIds
  }
}

function placeImage(
  img: ImageDimensions,
  freeRects: FreeRect[],
  gap: number,
  _rng: SeededRandom
): PlacedImage | null {
  // Find best fitting free rectangle - NO ROTATION
  const candidates: ScoredRect[] = []

  for (const rect of freeRects) {
    // Only try normal orientation - no rotation allowed
    if (img.width <= rect.width && img.height <= rect.height) {
      candidates.push({
        rect,
        score: scoreRectFit(img.width, img.height, rect)
      })
    }
  }

  if (candidates.length === 0) {
    return null
  }

  // Sort by score (lower is better - tighter fit)
  candidates.sort((a, b) => a.score - b.score)

  // Pick the best candidate (no randomness for tighter packing)
  const selected = candidates[0]

  // Create placement - image keeps original dimensions
  const placement: PlacedImage = {
    imageId: img.id,
    rect: {
      x: selected.rect.x,
      y: selected.rect.y,
      width: img.width,
      height: img.height
    },
    scaleFactor: 1.0,
    rotated: false
  }

  // Split the free rectangle with gap for spacing between images
  splitFreeRect(selected.rect, img.width + gap, img.height + gap, freeRects)

  return placement
}

function scoreRectFit(imgWidth: number, imgHeight: number, rect: FreeRect): number {
  // Best Short Side Fit (BSSF) - minimize the shorter leftover dimension
  // This tends to leave more usable rectangular spaces
  const leftoverWidth = rect.width - imgWidth
  const leftoverHeight = rect.height - imgHeight
  return Math.min(leftoverWidth, leftoverHeight)
}

function splitFreeRect(
  rect: FreeRect,
  usedWidth: number,
  usedHeight: number,
  freeRects: FreeRect[]
): void {
  // Remove the used rectangle
  const idx = freeRects.indexOf(rect)
  if (idx !== -1) {
    freeRects.splice(idx, 1)
  }

  const remainingWidth = rect.width - usedWidth
  const remainingHeight = rect.height - usedHeight

  // Minimum fragment size - very small to maximize packing
  const minFragment = 0.1 // inches

  // Use "Shorter Axis Split" rule deterministically for best packing
  // Split along the axis with less remaining space
  if (remainingWidth > minFragment && remainingHeight > minFragment) {
    if (remainingWidth <= remainingHeight) {
      // Horizontal split
      // Right rectangle (beside placed image, same height as placed)
      freeRects.push({
        x: rect.x + usedWidth,
        y: rect.y,
        width: remainingWidth,
        height: usedHeight
      })
      // Bottom rectangle (full width of original rect)
      freeRects.push({
        x: rect.x,
        y: rect.y + usedHeight,
        width: rect.width,
        height: remainingHeight
      })
    } else {
      // Vertical split
      // Right rectangle (full height of original rect)
      freeRects.push({
        x: rect.x + usedWidth,
        y: rect.y,
        width: remainingWidth,
        height: rect.height
      })
      // Bottom rectangle (width of placed image only)
      freeRects.push({
        x: rect.x,
        y: rect.y + usedHeight,
        width: usedWidth,
        height: remainingHeight
      })
    }
  } else if (remainingWidth > minFragment) {
    // Only horizontal space left
    freeRects.push({
      x: rect.x + usedWidth,
      y: rect.y,
      width: remainingWidth,
      height: rect.height
    })
  } else if (remainingHeight > minFragment) {
    // Only vertical space left
    freeRects.push({
      x: rect.x,
      y: rect.y + usedHeight,
      width: rect.width,
      height: remainingHeight
    })
  }

  // Merge adjacent free rectangles to reduce fragmentation
  mergeFreeRects(freeRects, minFragment)
}

function mergeFreeRects(freeRects: FreeRect[], minSize: number): void {
  // Remove tiny rectangles first
  for (let i = freeRects.length - 1; i >= 0; i--) {
    if (freeRects[i].width < minSize || freeRects[i].height < minSize) {
      freeRects.splice(i, 1)
    }
  }

  // Try to merge adjacent rectangles
  let merged = true
  while (merged) {
    merged = false
    for (let i = 0; i < freeRects.length && !merged; i++) {
      for (let j = i + 1; j < freeRects.length && !merged; j++) {
        const a = freeRects[i]
        const b = freeRects[j]
        const tolerance = 0.01

        // Check if they can merge horizontally (same x and width, adjacent y)
        if (
          Math.abs(a.x - b.x) < tolerance &&
          Math.abs(a.width - b.width) < tolerance &&
          Math.abs(a.y + a.height - b.y) < tolerance
        ) {
          a.height += b.height
          freeRects.splice(j, 1)
          merged = true
        }
        // Check if they can merge vertically (same y and height, adjacent x)
        else if (
          Math.abs(a.y - b.y) < tolerance &&
          Math.abs(a.height - b.height) < tolerance &&
          Math.abs(a.x + a.width - b.x) < tolerance
        ) {
          a.width += b.width
          freeRects.splice(j, 1)
          merged = true
        }
      }
    }
  }
}

export default guillotineAlgorithm
