/**
 * Algorithm Helper Functions
 *
 * Shared utility functions used across all collage layout algorithms
 */

import type { ImageDimensions, AlgorithmOutput, PlacedImage } from '../types'

/**
 * Filter images that are too small to be placed
 */
export function filterValidImages(
  images: ImageDimensions[],
  minImageSizeInches: number
): ImageDimensions[] {
  return images.filter(img => img.width >= minImageSizeInches && img.height >= minImageSizeInches)
}

/**
 * Calculate the coverage ratio of placements on a page
 */
export function calculateCoverage(
  placements: PlacedImage[],
  pageWidth: number,
  pageHeight: number
): number {
  const usedArea = placements.reduce((sum, p) => sum + p.rect.width * p.rect.height, 0)
  const totalArea = pageWidth * pageHeight
  return usedArea / totalArea
}

/**
 * Create an empty algorithm output (when no images can be placed)
 */
export function createEmptyOutput(images: ImageDimensions[]): AlgorithmOutput {
  return {
    placements: [],
    coverage: 0,
    unusedImageIds: images.map(i => i.id)
  }
}
