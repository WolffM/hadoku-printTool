/**
 * Scale Factor Optimization
 *
 * Finds the optimal scale factor for images to achieve ~95% page coverage
 * Supports image normalization to make all images similar sizes
 */

import type { CollageAlgorithm } from '../../types'
import type { AlgorithmInput, AlgorithmOutput, ImageDimensions } from './types'
import { getAlgorithm } from './algorithms'

const TARGET_COVERAGE = 0.92
const COVERAGE_TOLERANCE = 0.05 // +/- 5%

interface OptimizationResult {
  bestScale: number
  output: AlgorithmOutput
  iterations: number
}

/**
 * Find the optimal scale factor to maximize page coverage
 */
export function optimizeScaleFactor(
  images: ImageDimensions[],
  pageWidth: number,
  pageHeight: number,
  algorithm: CollageAlgorithm,
  gapInches: number,
  minImageSizeInches: number,
  seed: number,
  maxDownscalePercent: number,
  normalizeImageSizes = false
): OptimizationResult {
  const algorithmFn = getAlgorithm(algorithm)
  const minScale = 1 - maxDownscalePercent / 100 // e.g., 0.1 for 90% downscale

  // If normalizing, pre-process images to similar sizes
  const processedImages = normalizeImageSizes
    ? normalizeImages(images, pageWidth, pageHeight, minImageSizeInches, maxDownscalePercent)
    : images

  // Phase 1: Coarse search with more aggressive scale options
  const coarseScales = [1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.15, 0.1].filter(s => s >= minScale)
  let bestScale = 1.0
  let bestCoverage = 0
  let bestOutput: AlgorithmOutput | null = null
  let iterations = 0

  for (const scale of coarseScales) {
    const scaledImages = scaleImages(processedImages, scale, minImageSizeInches)

    // Skip if we don't have enough images
    if (scaledImages.length < 1) continue

    const input: AlgorithmInput = {
      images: scaledImages,
      pageWidth,
      pageHeight,
      gapInches,
      minImageSizeInches,
      seed
    }

    const output = algorithmFn(input)
    iterations++

    // Prefer solutions that place more images
    const placedRatio = output.placements.length / images.length
    const effectiveCoverage = output.coverage * (0.5 + 0.5 * placedRatio)

    if (
      effectiveCoverage > bestCoverage ||
      output.placements.length > (bestOutput?.placements.length ?? 0)
    ) {
      bestCoverage = effectiveCoverage
      bestScale = scale
      bestOutput = output
    }

    // Early exit if we hit target coverage with good placement
    if (output.coverage >= TARGET_COVERAGE - COVERAGE_TOLERANCE && placedRatio >= 0.66) {
      return { bestScale: scale, output, iterations }
    }
  }

  // Phase 2: Fine-tuning with binary search
  if (bestOutput) {
    const fineResult = binarySearchScale(
      processedImages,
      pageWidth,
      pageHeight,
      algorithmFn,
      gapInches,
      minImageSizeInches,
      seed,
      Math.max(minScale, bestScale - 0.15),
      Math.min(1.0, bestScale + 0.15),
      bestOutput,
      bestScale,
      images.length
    )

    return {
      bestScale: fineResult.scale,
      output: fineResult.output,
      iterations: iterations + fineResult.iterations
    }
  }

  return {
    bestScale,
    output: bestOutput ?? { placements: [], coverage: 0, unusedImageIds: images.map(i => i.id) },
    iterations
  }
}

/**
 * Normalize images to similar sizes based on target area
 * Larger images get scaled down more, smaller images stay closer to original
 */
function normalizeImages(
  images: ImageDimensions[],
  pageWidth: number,
  pageHeight: number,
  minImageSizeInches: number,
  maxDownscalePercent: number
): ImageDimensions[] {
  if (images.length === 0) return []

  const pageArea = pageWidth * pageHeight
  // Target: each image should occupy roughly equal space
  // Aim for 85% coverage divided among all images
  const targetAreaPerImage = (pageArea * 0.85) / images.length
  const minScale = 1 - maxDownscalePercent / 100

  return images.map(img => {
    // Calculate how much larger this image is compared to target
    const areaRatio = img.area / targetAreaPerImage

    // Scale factor: images larger than target get scaled down more
    // Use a smoothed scaling function
    let scaleFactor: number
    if (areaRatio > 1) {
      // Large image - scale down towards target
      // sqrt gives a smoother reduction
      scaleFactor = 1 / Math.sqrt(areaRatio)
    } else {
      // Small image - keep closer to original (slight scale up allowed)
      scaleFactor = Math.min(1.2, 1 / Math.pow(areaRatio, 0.3))
    }

    // Clamp scale factor
    scaleFactor = Math.max(minScale, Math.min(1.5, scaleFactor))

    const newWidth = img.width * scaleFactor
    const newHeight = img.height * scaleFactor

    // Ensure minimum size
    if (newWidth < minImageSizeInches || newHeight < minImageSizeInches) {
      const minDim = Math.min(newWidth, newHeight)
      const rescale = minImageSizeInches / minDim
      return {
        ...img,
        width: newWidth * rescale,
        height: newHeight * rescale,
        area: newWidth * newHeight * rescale * rescale
      }
    }

    return {
      ...img,
      width: newWidth,
      height: newHeight,
      area: newWidth * newHeight
    }
  })
}

function binarySearchScale(
  images: ImageDimensions[],
  pageWidth: number,
  pageHeight: number,
  algorithmFn: (input: AlgorithmInput) => AlgorithmOutput,
  gapInches: number,
  minImageSizeInches: number,
  seed: number,
  minScale: number,
  maxScale: number,
  bestOutput: AlgorithmOutput,
  bestScale: number,
  totalImageCount: number,
  maxIterations = 8
): { scale: number; output: AlgorithmOutput; iterations: number } {
  let low = minScale
  let high = maxScale
  let iterations = 0

  while (iterations < maxIterations && high - low > 0.02) {
    const mid = (low + high) / 2
    const scaledImages = scaleImages(images, mid, minImageSizeInches)

    if (scaledImages.length === 0) {
      high = mid
      iterations++
      continue
    }

    const input: AlgorithmInput = {
      images: scaledImages,
      pageWidth,
      pageHeight,
      gapInches,
      minImageSizeInches,
      seed
    }

    const output = algorithmFn(input)
    iterations++

    // Score based on coverage and placement count
    const placedRatio = output.placements.length / totalImageCount
    const currentScore = output.coverage * (0.5 + 0.5 * placedRatio)
    const bestScore =
      bestOutput.coverage * (0.5 + 0.5 * (bestOutput.placements.length / totalImageCount))

    if (currentScore > bestScore) {
      bestOutput = output
      bestScale = mid
    }

    // Adjust search range based on coverage
    if (output.coverage < TARGET_COVERAGE) {
      // Need smaller images to fit more
      high = mid
    } else if (output.coverage > TARGET_COVERAGE + COVERAGE_TOLERANCE) {
      // Can try larger images
      low = mid
    } else {
      // Within target range - prefer more placements
      if (output.placements.length >= totalImageCount * 0.66) {
        return { scale: mid, output, iterations }
      }
      // Not enough placements, try smaller
      high = mid
    }
  }

  return { scale: bestScale, output: bestOutput, iterations }
}

function scaleImages(images: ImageDimensions[], scale: number, minSize: number): ImageDimensions[] {
  return images
    .map(img => ({
      ...img,
      width: img.width * scale,
      height: img.height * scale,
      area: img.area * scale * scale
    }))
    .filter(img => img.width >= minSize && img.height >= minSize)
}

/**
 * Calculate image dimensions in inches from pixel dimensions and DPI
 */
export function imagesToDimensions(
  images: { id: string; width: number; height: number }[],
  dpi: number
): ImageDimensions[] {
  return images.map(img => {
    const widthInches = img.width / dpi
    const heightInches = img.height / dpi
    return {
      id: img.id,
      width: widthInches,
      height: heightInches,
      area: widthInches * heightInches,
      aspectRatio: widthInches / heightInches
    }
  })
}
