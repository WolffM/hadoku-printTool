/**
 * Masonry Algorithm
 *
 * Pinterest-style column-based packing:
 * 1. Calculate optimal number of columns based on average image width
 * 2. Place each image in the column with the shortest height
 * 3. Good for varied aspect ratios, especially portrait-heavy sets
 */

import type { AlgorithmInput, AlgorithmOutput, PlacedImage, ImageDimensions } from '../types'
import { SeededRandom, biasedShuffleByArea } from '../randomization'
import { filterValidImages, calculateCoverage, createEmptyOutput } from '../utils'

interface Column {
  x: number
  width: number
  currentY: number
  images: PlacedImage[]
}

export function masonryAlgorithm(input: AlgorithmInput): AlgorithmOutput {
  const { images, pageWidth, pageHeight, gapInches, minImageSizeInches, seed } = input
  const rng = new SeededRandom(seed)

  // Filter out images that are too small
  const validImages = filterValidImages(images, minImageSizeInches)

  if (validImages.length === 0) {
    return createEmptyOutput(images)
  }

  // Calculate optimal column count based on average image width
  const avgWidth = validImages.reduce((sum, img) => sum + img.width, 0) / validImages.length
  let columnCount = Math.max(2, Math.round(pageWidth / (avgWidth + gapInches)))

  // Adjust if columns would be too narrow
  const columnWidth = (pageWidth - gapInches * (columnCount - 1)) / columnCount
  if (columnWidth < minImageSizeInches) {
    columnCount = Math.max(1, Math.floor(pageWidth / (minImageSizeInches + gapInches)))
  }

  // Initialize columns starting from x=0
  const columns: Column[] = []
  const finalColumnWidth = (pageWidth - gapInches * (columnCount - 1)) / columnCount

  for (let i = 0; i < columnCount; i++) {
    columns.push({
      x: i * (finalColumnWidth + gapInches),
      width: finalColumnWidth,
      currentY: 0,
      images: []
    })
  }

  // Sort with biased shuffle - larger images first with randomness
  const sortedImages = biasedShuffleByArea(validImages, rng, 0.6)

  const placements: PlacedImage[] = []
  const unusedImageIds: string[] = []

  for (const img of sortedImages) {
    const placed = placeInShortestColumn(img, columns, pageHeight, gapInches)
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

function placeInShortestColumn(
  img: ImageDimensions,
  columns: Column[],
  pageHeight: number,
  gap: number
): PlacedImage | null {
  // Find the column with the least height
  let shortestColumn = columns[0]
  for (const col of columns) {
    if (col.currentY < shortestColumn.currentY) {
      shortestColumn = col
    }
  }

  // Scale image to fit column width while preserving aspect ratio
  const scale = shortestColumn.width / img.width
  const scaledHeight = img.height * scale

  // Check if image fits in remaining page height
  if (shortestColumn.currentY + scaledHeight > pageHeight) {
    return null
  }

  const placement: PlacedImage = {
    imageId: img.id,
    rect: {
      x: shortestColumn.x,
      y: shortestColumn.currentY,
      width: shortestColumn.width,
      height: scaledHeight
    },
    scaleFactor: scale,
    rotated: false
  }

  shortestColumn.currentY += scaledHeight + gap
  shortestColumn.images.push(placement)

  return placement
}

export default masonryAlgorithm
