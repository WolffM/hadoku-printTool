/**
 * Treemap (Squarified) Algorithm
 *
 * Recursive space partitioning algorithm:
 * 1. Divide images into groups that fill horizontal or vertical strips
 * 2. Recursively subdivide each strip
 * 3. Maintains aspect ratios reasonably well
 * 4. Good for creating a balanced, organized look
 */

import type {
  AlgorithmInput,
  AlgorithmOutput,
  PlacedImage,
  ImageDimensions,
  CollageRect
} from '../types'
import { SeededRandom, biasedShuffleByArea } from '../randomization'
import { filterValidImages, calculateCoverage, createEmptyOutput } from '../utils'

export function treemapAlgorithm(input: AlgorithmInput): AlgorithmOutput {
  const { images, pageWidth, pageHeight, gapInches, minImageSizeInches, seed } = input
  const rng = new SeededRandom(seed)

  // Filter out images that are too small
  const validImages = filterValidImages(images, minImageSizeInches)

  if (validImages.length === 0) {
    return createEmptyOutput(images)
  }

  // Sort by area with moderate randomness
  const sortedImages = biasedShuffleByArea(validImages, rng, 0.65)

  // Use full page area (no margin - gap is between images only)
  const usableRect: CollageRect = {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight
  }

  // Calculate total area of all images
  const totalImageArea = sortedImages.reduce((sum, img) => sum + img.area, 0)
  const availableArea = usableRect.width * usableRect.height

  // Scale images proportionally to fill the available space
  const scaleFactor = Math.sqrt(availableArea / totalImageArea) * 0.85 // 85% to leave gaps

  const scaledImages: ImageDimensions[] = sortedImages.map(img => ({
    ...img,
    width: img.width * scaleFactor,
    height: img.height * scaleFactor,
    area: img.area * scaleFactor * scaleFactor
  }))

  // Apply squarified treemap layout
  const placements = squarify(scaledImages, usableRect, gapInches, rng)

  // Find unused images (those that couldn't be placed)
  const placedIds = new Set(placements.map(p => p.imageId))
  const unusedImageIds = images.filter(img => !placedIds.has(img.id)).map(img => img.id)

  return {
    placements,
    coverage: calculateCoverage(placements, pageWidth, pageHeight),
    unusedImageIds
  }
}

function squarify(
  images: ImageDimensions[],
  rect: CollageRect,
  gap: number,
  rng: SeededRandom
): PlacedImage[] {
  if (images.length === 0) return []
  if (images.length === 1) {
    return [layoutSingle(images[0], rect)]
  }

  // Find the best split point
  const isWide = rect.width >= rect.height
  const totalArea = images.reduce((sum, img) => sum + img.area, 0)

  let bestSplit = 1
  let bestAspectRatio = Infinity

  // Try different split points
  let runningArea = 0
  for (let i = 0; i < images.length - 1; i++) {
    runningArea += images[i].area
    const ratio = runningArea / totalArea

    // Calculate the aspect ratio of the first group
    const groupWidth = isWide ? rect.width * ratio : rect.width
    const groupHeight = isWide ? rect.height : rect.height * ratio

    // Average aspect ratio of items in the group
    const groupImages = images.slice(0, i + 1)
    const avgAspect =
      groupImages.reduce((sum, img) => sum + img.aspectRatio, 0) / groupImages.length
    const containerAspect = groupWidth / groupHeight

    const aspectDiff = Math.abs(Math.log(avgAspect) - Math.log(containerAspect))

    if (aspectDiff < bestAspectRatio) {
      bestAspectRatio = aspectDiff
      bestSplit = i + 1
    }
  }

  // Add slight randomness to split point
  if (rng.next() < 0.2 && bestSplit > 1 && bestSplit < images.length - 1) {
    bestSplit += rng.next() < 0.5 ? -1 : 1
  }

  const firstGroup = images.slice(0, bestSplit)
  const secondGroup = images.slice(bestSplit)

  const firstArea = firstGroup.reduce((sum, img) => sum + img.area, 0)
  const ratio = firstArea / totalArea

  let firstRect: CollageRect
  let secondRect: CollageRect

  if (isWide) {
    const splitX = rect.x + rect.width * ratio
    firstRect = {
      x: rect.x,
      y: rect.y,
      width: rect.width * ratio - gap / 2,
      height: rect.height
    }
    secondRect = {
      x: splitX + gap / 2,
      y: rect.y,
      width: rect.width * (1 - ratio) - gap / 2,
      height: rect.height
    }
  } else {
    const splitY = rect.y + rect.height * ratio
    firstRect = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height * ratio - gap / 2
    }
    secondRect = {
      x: rect.x,
      y: splitY + gap / 2,
      width: rect.width,
      height: rect.height * (1 - ratio) - gap / 2
    }
  }

  // Recursively layout each group
  const firstPlacements = squarify(firstGroup, firstRect, gap, rng)
  const secondPlacements = squarify(secondGroup, secondRect, gap, rng)

  return [...firstPlacements, ...secondPlacements]
}

function layoutSingle(img: ImageDimensions, rect: CollageRect): PlacedImage {
  // Scale image to fit within the rect while maintaining aspect ratio
  const scaleX = rect.width / img.width
  const scaleY = rect.height / img.height
  const scale = Math.min(scaleX, scaleY)

  const finalWidth = img.width * scale
  const finalHeight = img.height * scale

  // Center within the rect
  const x = rect.x + (rect.width - finalWidth) / 2
  const y = rect.y + (rect.height - finalHeight) / 2

  return {
    imageId: img.id,
    rect: { x, y, width: finalWidth, height: finalHeight },
    scaleFactor: scale,
    rotated: false
  }
}

export default treemapAlgorithm
