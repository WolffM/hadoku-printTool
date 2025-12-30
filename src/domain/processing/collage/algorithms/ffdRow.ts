/**
 * FFD-Row (First Fit Decreasing Row) Algorithm
 *
 * A simple row-based packing algorithm:
 * 1. Sort images by area (descending) with biased shuffle for randomness
 * 2. Place images left-to-right in rows
 * 3. Start a new row when current row is full
 * 4. Good for similar-sized images
 */

import type { AlgorithmInput, AlgorithmOutput, PlacedImage, ImageDimensions } from '../types'
import { SeededRandom, biasedShuffleByArea } from '../randomization'
import { filterValidImages, calculateCoverage } from '../utils'

interface Row {
  y: number
  height: number
  currentX: number
  images: PlacedImage[]
}

export function ffdRowAlgorithm(input: AlgorithmInput): AlgorithmOutput {
  const { images, pageWidth, pageHeight, gapInches, minImageSizeInches, seed } = input
  const rng = new SeededRandom(seed)

  // Filter out images that are too small
  const validImages = filterValidImages(images, minImageSizeInches)

  // Sort by area descending with randomized bias
  const sortedImages = biasedShuffleByArea(validImages, rng, 0.7)

  const placements: PlacedImage[] = []
  const rows: Row[] = []
  const unusedImageIds: string[] = []

  // Start first row at top-left corner (no margin - gap is between images only)
  let currentRow: Row = {
    y: 0,
    height: 0,
    currentX: 0,
    images: []
  }
  rows.push(currentRow)

  for (const img of sortedImages) {
    const placed = tryPlaceImage(img, currentRow, rows, pageWidth, pageHeight, gapInches, rng)

    if (placed) {
      placements.push(placed)
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

function tryPlaceImage(
  img: ImageDimensions,
  currentRow: Row,
  rows: Row[],
  pageWidth: number,
  pageHeight: number,
  gap: number,
  _rng: SeededRandom
): PlacedImage | null {
  // Try to fit in current row
  const spaceInRow = pageWidth - currentRow.currentX

  if (img.width <= spaceInRow) {
    // Fits in current row
    const placed = placeInRow(img, currentRow, gap)
    return placed
  }

  // Try starting a new row
  const newRowY = currentRow.y + currentRow.height + gap
  if (newRowY + img.height > pageHeight) {
    // Image too tall for remaining page space
    return null
  }

  // Start new row at x=0
  const newRow: Row = {
    y: newRowY,
    height: 0,
    currentX: 0,
    images: []
  }
  rows.push(newRow)

  // Update currentRow reference for caller
  Object.assign(currentRow, newRow)

  // Check if image fits in row width
  if (img.width > pageWidth) {
    // Image too wide for page
    return null
  }

  return placeInRow(img, newRow, gap)
}

function placeInRow(img: ImageDimensions, row: Row, gap: number): PlacedImage {
  const placement: PlacedImage = {
    imageId: img.id,
    rect: {
      x: row.currentX,
      y: row.y,
      width: img.width,
      height: img.height
    },
    scaleFactor: 1.0,
    rotated: false
  }

  row.currentX += img.width + gap
  row.height = Math.max(row.height, img.height)
  row.images.push(placement)

  return placement
}

export default ffdRowAlgorithm
