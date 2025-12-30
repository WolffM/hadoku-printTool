/**
 * Spiral Algorithm
 *
 * Places images in a true spiral pattern from the outside edges inward:
 * 1. Fill top edge completely (left to right)
 * 2. Fill right edge completely (top to bottom)
 * 3. Fill bottom edge completely (right to left)
 * 4. Fill left edge completely (bottom to top)
 * 5. Scale up images on each edge to fill remaining space
 * 6. Shrink bounds inward and repeat
 * 7. Post-process: tuck images into gaps from adjacent edges
 *
 * NO ROTATION - images maintain their original orientation
 */

import type { AlgorithmInput, AlgorithmOutput, PlacedImage, ImageDimensions } from '../types'
import { SeededRandom, biasedShuffleByArea } from '../randomization'
import {
  findMinY,
  findMaxY,
  findMinX,
  findMaxX,
  findSpaceRight,
  findSpaceLeft,
  findSpaceBelow,
  findSpaceAbove,
  filterValidImages,
  calculateCoverage,
  createEmptyOutput
} from '../utils'

type Edge = 'top' | 'right' | 'bottom' | 'left'

/**
 * Post-process placements to tuck images into available gaps.
 *
 * For each image, try to move it toward the nearest page edge
 * (based on which edge it was placed on) as long as it doesn't
 * collide with other images.
 *
 * - Top edge images: try to move up (decrease y)
 * - Right edge images: try to move right (increase x)
 * - Bottom edge images: try to move down (increase y)
 * - Left edge images: try to move left (decrease x)
 */
function tuckPlacements(
  placements: PlacedImage[],
  gap: number,
  pageWidth: number,
  pageHeight: number
): PlacedImage[] {
  // Create a copy we can modify
  const result = placements.map(p => ({
    ...p,
    rect: { ...p.rect }
  }))

  // Process each placement and try to tuck it
  for (let i = 0; i < result.length; i++) {
    const placement = result[i]
    const rect = placement.rect

    // Determine which edge this image is closest to
    const distToTop = rect.y
    const distToRight = pageWidth - (rect.x + rect.width)
    const distToBottom = pageHeight - (rect.y + rect.height)
    const distToLeft = rect.x

    const minDist = Math.min(distToTop, distToRight, distToBottom, distToLeft)

    // Try to tuck toward the closest edge
    if (minDist === distToTop && distToTop > gap) {
      // Try to move up
      const newY = findMinY(rect, result, i, gap)
      if (newY < rect.y) {
        rect.y = newY
      }
    } else if (minDist === distToRight && distToRight > gap) {
      // Try to move right
      const newX = findMaxX(rect, result, i, gap, pageWidth)
      if (newX > rect.x) {
        rect.x = newX
      }
    } else if (minDist === distToBottom && distToBottom > gap) {
      // Try to move down
      const newY = findMaxY(rect, result, i, gap, pageHeight)
      if (newY > rect.y) {
        rect.y = newY
      }
    } else if (minDist === distToLeft && distToLeft > gap) {
      // Try to move left
      const newX = findMinX(rect, result, i, gap)
      if (newX < rect.x) {
        rect.x = newX
      }
    }
  }

  return result
}

/**
 * Shift images outward, away from the center of the page.
 * This consolidates white space toward the center of the collage.
 *
 * For each image:
 * - If closer to top edge: try to move up
 * - If closer to right edge: try to move right
 * - If closer to bottom edge: try to move down
 * - If closer to left edge: try to move left
 */
function shiftOutward(
  placements: PlacedImage[],
  gap: number,
  pageWidth: number,
  pageHeight: number
): PlacedImage[] {
  const result = placements.map(p => ({
    ...p,
    rect: { ...p.rect }
  }))

  const centerX = pageWidth / 2
  const centerY = pageHeight / 2

  // Process each placement and try to shift it outward
  for (let i = 0; i < result.length; i++) {
    const placement = result[i]
    const rect = placement.rect

    // Calculate image center
    const imgCenterX = rect.x + rect.width / 2
    const imgCenterY = rect.y + rect.height / 2

    // Determine primary direction to shift (away from center)
    const dx = imgCenterX - centerX
    const dy = imgCenterY - centerY

    // Shift in the dominant direction away from center
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal shift is dominant
      if (dx > 0) {
        // Image is right of center, try to move right
        const newX = findMaxX(rect, result, i, gap, pageWidth)
        if (newX > rect.x) {
          rect.x = newX
        }
      } else {
        // Image is left of center, try to move left
        const newX = findMinX(rect, result, i, gap)
        if (newX < rect.x) {
          rect.x = newX
        }
      }
    } else {
      // Vertical shift is dominant
      if (dy > 0) {
        // Image is below center, try to move down
        const newY = findMaxY(rect, result, i, gap, pageHeight)
        if (newY > rect.y) {
          rect.y = newY
        }
      } else {
        // Image is above center, try to move up
        const newY = findMinY(rect, result, i, gap)
        if (newY < rect.y) {
          rect.y = newY
        }
      }
    }
  }

  return result
}

/**
 * Expand images toward the center to fill gaps.
 * This grows images inward (toward center) to use available space.
 *
 * Important: scaleFactor can never exceed 1.0 (original size).
 * Images start smaller and are "expanded" back toward their original size.
 *
 * For each image, we check how much we can expand toward the center
 * without colliding with other images, then apply uniform scaling.
 */
function expandToFillCenter(
  placements: PlacedImage[],
  gap: number,
  pageWidth: number,
  pageHeight: number
): PlacedImage[] {
  const result = placements.map(p => ({
    ...p,
    rect: { ...p.rect }
  }))

  const centerX = pageWidth / 2
  const centerY = pageHeight / 2

  // Process each placement and try to expand it toward center
  for (let i = 0; i < result.length; i++) {
    const placement = result[i]
    const rect = placement.rect

    // Skip if already at max scale (1.0)
    if (placement.scaleFactor >= 1.0) continue

    // Calculate image center
    const imgCenterX = rect.x + rect.width / 2
    const imgCenterY = rect.y + rect.height / 2

    // Determine direction toward center
    const dx = centerX - imgCenterX
    const dy = centerY - imgCenterY

    // Calculate max possible scale increase (up to 1.0)
    const maxScaleIncrease = 1.0 / placement.scaleFactor

    // Try to find how much we can expand
    let possibleScale = maxScaleIncrease

    // Calculate the expansion direction (toward center)
    const expandRight = dx > 0
    const expandDown = dy > 0

    // Check how much room we have to expand in the dominant direction
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal expansion is dominant
      if (expandRight) {
        // Find space to the right
        const spaceRight = findSpaceRight(rect, result, i, gap, pageWidth)
        if (spaceRight > 0) {
          const scaleForSpace = (rect.width + spaceRight) / rect.width
          possibleScale = Math.min(possibleScale, scaleForSpace)
        } else {
          possibleScale = 1.0
        }
      } else {
        // Find space to the left
        const spaceLeft = findSpaceLeft(rect, result, i, gap)
        if (spaceLeft > 0) {
          const scaleForSpace = (rect.width + spaceLeft) / rect.width
          possibleScale = Math.min(possibleScale, scaleForSpace)
        } else {
          possibleScale = 1.0
        }
      }
    } else {
      // Vertical expansion is dominant
      if (expandDown) {
        // Find space below
        const spaceBelow = findSpaceBelow(rect, result, i, gap, pageHeight)
        if (spaceBelow > 0) {
          const scaleForSpace = (rect.height + spaceBelow) / rect.height
          possibleScale = Math.min(possibleScale, scaleForSpace)
        } else {
          possibleScale = 1.0
        }
      } else {
        // Find space above
        const spaceAbove = findSpaceAbove(rect, result, i, gap)
        if (spaceAbove > 0) {
          const scaleForSpace = (rect.height + spaceAbove) / rect.height
          possibleScale = Math.min(possibleScale, scaleForSpace)
        } else {
          possibleScale = 1.0
        }
      }
    }

    // Only expand if we have room and haven't hit max scale
    if (possibleScale > 1.0) {
      const newScale = Math.min(placement.scaleFactor * possibleScale, 1.0)
      const actualScaleChange = newScale / placement.scaleFactor

      if (actualScaleChange > 1.001) {
        // Only apply if meaningful change
        const newWidth = rect.width * actualScaleChange
        const newHeight = rect.height * actualScaleChange

        // Expand toward center (anchor on the edge away from center)
        if (Math.abs(dx) > Math.abs(dy)) {
          if (expandRight) {
            // Anchor left edge, expand right
            rect.width = newWidth
            rect.height = newHeight
            // Adjust Y to keep vertically centered at same position
            rect.y = rect.y - (newHeight - placement.rect.height) / 2
          } else {
            // Anchor right edge, expand left
            rect.x = rect.x - (newWidth - rect.width)
            rect.width = newWidth
            rect.height = newHeight
            rect.y = rect.y - (newHeight - placement.rect.height) / 2
          }
        } else {
          if (expandDown) {
            // Anchor top edge, expand down
            rect.width = newWidth
            rect.height = newHeight
            rect.x = rect.x - (newWidth - placement.rect.width) / 2
          } else {
            // Anchor bottom edge, expand up
            rect.y = rect.y - (newHeight - rect.height)
            rect.width = newWidth
            rect.height = newHeight
            rect.x = rect.x - (newWidth - placement.rect.width) / 2
          }
        }

        placement.scaleFactor = newScale

        // Clamp to page bounds
        rect.x = Math.max(0, Math.min(rect.x, pageWidth - rect.width))
        rect.y = Math.max(0, Math.min(rect.y, pageHeight - rect.height))
      }
    }
  }

  return result
}

export function spiralAlgorithm(input: AlgorithmInput): AlgorithmOutput {
  const { images, pageWidth, pageHeight, gapInches, minImageSizeInches, seed } = input
  const rng = new SeededRandom(seed)

  // Filter out images that are too small
  const validImages = filterValidImages(images, minImageSizeInches)

  if (validImages.length === 0) {
    return createEmptyOutput(images)
  }

  // Sort by area descending with strong bias (larger images on outer edges)
  const sortedImages = biasedShuffleByArea(validImages, rng, 0.9)

  const placements: PlacedImage[] = []
  const unusedImageIds: string[] = []

  // Working bounds that shrink as we spiral inward
  let bounds = {
    left: 0,
    top: 0,
    right: pageWidth,
    bottom: pageHeight
  }

  let imageQueue = [...sortedImages]
  const gap = gapInches

  // Keep spiraling until we run out of images or space
  while (imageQueue.length > 0) {
    const startCount = imageQueue.length

    // Fill top edge (left to right)
    const topResult = fillEdge('top', imageQueue, bounds, gap, minImageSizeInches)
    if (topResult.placed.length > 0) {
      // Scale up images to fill the edge, then add to placements
      const scaledTop = scaleEdgeToFit('top', topResult.placed, bounds, gap)
      placements.push(...scaledTop.placements)
      bounds.top += scaledTop.newThickness + gap
    }
    imageQueue = topResult.remaining

    if (imageQueue.length === 0 || bounds.top >= bounds.bottom) break

    // Fill right edge (top to bottom)
    const rightResult = fillEdge('right', imageQueue, bounds, gap, minImageSizeInches)
    if (rightResult.placed.length > 0) {
      const scaledRight = scaleEdgeToFit('right', rightResult.placed, bounds, gap)
      placements.push(...scaledRight.placements)
      bounds.right -= scaledRight.newThickness + gap
    }
    imageQueue = rightResult.remaining

    if (imageQueue.length === 0 || bounds.left >= bounds.right) break

    // Fill bottom edge (right to left)
    const bottomResult = fillEdge('bottom', imageQueue, bounds, gap, minImageSizeInches)
    if (bottomResult.placed.length > 0) {
      const scaledBottom = scaleEdgeToFit('bottom', bottomResult.placed, bounds, gap)
      placements.push(...scaledBottom.placements)
      bounds.bottom -= scaledBottom.newThickness + gap
    }
    imageQueue = bottomResult.remaining

    if (imageQueue.length === 0 || bounds.top >= bounds.bottom) break

    // Fill left edge (bottom to top)
    const leftResult = fillEdge('left', imageQueue, bounds, gap, minImageSizeInches)
    if (leftResult.placed.length > 0) {
      const scaledLeft = scaleEdgeToFit('left', leftResult.placed, bounds, gap)
      placements.push(...scaledLeft.placements)
      bounds.left += scaledLeft.newThickness + gap
    }
    imageQueue = leftResult.remaining

    // Check if we made any progress this round
    if (imageQueue.length === startCount) {
      // No images were placed, remaining images don't fit
      break
    }

    // Check if bounds have collapsed
    const availableWidth = bounds.right - bounds.left
    const availableHeight = bounds.bottom - bounds.top
    if (availableWidth < minImageSizeInches || availableHeight < minImageSizeInches) {
      break
    }
  }

  // Add remaining images as unused
  for (const img of imageQueue) {
    unusedImageIds.push(img.id)
  }

  // Post-process step 1: tuck images into available gaps
  const tuckedPlacements = tuckPlacements(placements, gap, pageWidth, pageHeight)

  // Post-process step 2: shift images outward to consolidate white space in center
  const shiftedPlacements = shiftOutward(tuckedPlacements, gap, pageWidth, pageHeight)

  // Post-process step 3: expand images toward center to fill gaps (up to 1.0 scale)
  const expandedPlacements = expandToFillCenter(shiftedPlacements, gap, pageWidth, pageHeight)

  return {
    placements: expandedPlacements,
    coverage: calculateCoverage(expandedPlacements, pageWidth, pageHeight),
    unusedImageIds
  }
}

interface FillResult {
  placed: PlacedImage[]
  remaining: ImageDimensions[]
  maxThickness: number
}

function fillEdge(
  edge: Edge,
  images: ImageDimensions[],
  bounds: { left: number; top: number; right: number; bottom: number },
  gap: number,
  minSize: number
): FillResult {
  const placed: PlacedImage[] = []
  const remaining: ImageDimensions[] = []
  let maxThickness = 0

  // Determine the available length along this edge
  let cursor: number
  let availableThickness: number

  switch (edge) {
    case 'top':
      cursor = bounds.left
      availableThickness = bounds.bottom - bounds.top
      break
    case 'right':
      cursor = bounds.top
      availableThickness = bounds.right - bounds.left
      break
    case 'bottom':
      cursor = bounds.right
      availableThickness = bounds.bottom - bounds.top
      break
    case 'left':
      cursor = bounds.bottom
      availableThickness = bounds.bottom - bounds.top
      break
  }

  for (const img of images) {
    // Get dimensions based on edge orientation
    const lengthDim = edge === 'top' || edge === 'bottom' ? img.width : img.height
    const thicknessDim = edge === 'top' || edge === 'bottom' ? img.height : img.width

    // Check if image fits in thickness
    if (thicknessDim > availableThickness || lengthDim < minSize) {
      remaining.push(img)
      continue
    }

    // Check if there's room along the edge
    let fits = false
    let x = 0
    let y = 0

    switch (edge) {
      case 'top':
        if (cursor + lengthDim <= bounds.right) {
          x = cursor
          y = bounds.top
          cursor += lengthDim + gap
          fits = true
        }
        break
      case 'right':
        if (cursor + lengthDim <= bounds.bottom) {
          x = bounds.right - thicknessDim
          y = cursor
          cursor += lengthDim + gap
          fits = true
        }
        break
      case 'bottom':
        if (cursor - lengthDim >= bounds.left) {
          x = cursor - lengthDim
          y = bounds.bottom - thicknessDim
          cursor -= lengthDim + gap
          fits = true
        }
        break
      case 'left':
        if (cursor - lengthDim >= bounds.top) {
          x = bounds.left
          y = cursor - lengthDim
          cursor -= lengthDim + gap
          fits = true
        }
        break
    }

    if (fits) {
      placed.push({
        imageId: img.id,
        rect: { x, y, width: img.width, height: img.height },
        scaleFactor: 1.0,
        rotated: false
      })
      maxThickness = Math.max(maxThickness, thicknessDim)
    } else {
      remaining.push(img)
    }
  }

  return { placed, remaining, maxThickness }
}

interface ScaleResult {
  placements: PlacedImage[]
  newThickness: number
}

/**
 * Scale up images on an edge to fill remaining space.
 *
 * The math:
 * - For N images with lengths L1, L2, ... LN and (N-1) gaps of size G
 * - Current used length = L1 + L2 + ... + LN + (N-1)*G
 * - Available edge length = E
 * - We want: s*L1 + s*L2 + ... + s*LN + (N-1)*G = E
 * - So: s * (L1 + L2 + ... + LN) = E - (N-1)*G
 * - Scale factor s = (E - (N-1)*G) / (L1 + L2 + ... + LN)
 *
 * After scaling, we reposition images:
 * - Top edge: start at bounds.left, place left-to-right
 * - Right edge: start at bounds.top, place top-to-bottom, anchored to right
 * - Bottom edge: start at bounds.right, place right-to-left, anchored to bottom
 * - Left edge: start at bounds.bottom, place bottom-to-top, anchored to left
 */
function scaleEdgeToFit(
  edge: Edge,
  placed: PlacedImage[],
  bounds: { left: number; top: number; right: number; bottom: number },
  gap: number
): ScaleResult {
  if (placed.length === 0) {
    return { placements: [], newThickness: 0 }
  }

  // Calculate edge length and image dimensions along the edge
  let edgeLength: number
  let sumOfLengths = 0
  let maxOriginalThickness = 0

  switch (edge) {
    case 'top':
    case 'bottom':
      edgeLength = bounds.right - bounds.left
      for (const p of placed) {
        sumOfLengths += p.rect.width
        maxOriginalThickness = Math.max(maxOriginalThickness, p.rect.height)
      }
      break
    case 'right':
    case 'left':
      edgeLength = bounds.bottom - bounds.top
      for (const p of placed) {
        sumOfLengths += p.rect.height
        maxOriginalThickness = Math.max(maxOriginalThickness, p.rect.width)
      }
      break
  }

  // Calculate the number of gaps (N-1 for N images)
  const numGaps = placed.length - 1
  const totalGapSpace = numGaps * gap

  // Available space for images (edge length minus gaps)
  const availableForImages = edgeLength - totalGapSpace

  // Calculate scale factor
  // s = availableForImages / sumOfLengths
  let scaleFactor = availableForImages / sumOfLengths

  // Cap scale factor to avoid excessive enlargement (max 1.5x)
  // But we prefer to scale UP to fill space, not down
  scaleFactor = Math.min(scaleFactor, 1.5)
  scaleFactor = Math.max(scaleFactor, 1.0) // Don't scale down here

  // Calculate new thickness after scaling
  const newThickness = maxOriginalThickness * scaleFactor

  // Now reposition all images with new scaled dimensions
  const newPlacements: PlacedImage[] = []

  switch (edge) {
    case 'top': {
      // Place left to right, anchored to top
      let cursor = bounds.left
      for (const p of placed) {
        const newWidth = p.rect.width * scaleFactor
        const newHeight = p.rect.height * scaleFactor
        newPlacements.push({
          ...p,
          rect: {
            x: cursor,
            y: bounds.top,
            width: newWidth,
            height: newHeight
          },
          scaleFactor: p.scaleFactor * scaleFactor
        })
        cursor += newWidth + gap
      }
      break
    }
    case 'right': {
      // Place top to bottom, anchored to right edge
      let cursor = bounds.top
      for (const p of placed) {
        const newWidth = p.rect.width * scaleFactor
        const newHeight = p.rect.height * scaleFactor
        newPlacements.push({
          ...p,
          rect: {
            x: bounds.right - newWidth,
            y: cursor,
            width: newWidth,
            height: newHeight
          },
          scaleFactor: p.scaleFactor * scaleFactor
        })
        cursor += newHeight + gap
      }
      break
    }
    case 'bottom': {
      // Place right to left, anchored to bottom
      // Images were placed right-to-left, so we traverse in reverse to maintain order
      let cursor = bounds.right
      for (const p of placed) {
        const newWidth = p.rect.width * scaleFactor
        const newHeight = p.rect.height * scaleFactor
        newPlacements.push({
          ...p,
          rect: {
            x: cursor - newWidth,
            y: bounds.bottom - newHeight,
            width: newWidth,
            height: newHeight
          },
          scaleFactor: p.scaleFactor * scaleFactor
        })
        cursor -= newWidth + gap
      }
      break
    }
    case 'left': {
      // Place bottom to top, anchored to left edge
      let cursor = bounds.bottom
      for (const p of placed) {
        const newWidth = p.rect.width * scaleFactor
        const newHeight = p.rect.height * scaleFactor
        newPlacements.push({
          ...p,
          rect: {
            x: bounds.left,
            y: cursor - newHeight,
            width: newWidth,
            height: newHeight
          },
          scaleFactor: p.scaleFactor * scaleFactor
        })
        cursor -= newHeight + gap
      }
      break
    }
  }

  return { placements: newPlacements, newThickness }
}

export default spiralAlgorithm
