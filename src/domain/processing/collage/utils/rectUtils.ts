/**
 * Rectangle Utility Functions
 *
 * Shared geometry operations for collage layout algorithms
 */

import type { CollageRect, PlacedImage } from '../types'

/**
 * Check if two rectangles intersect (with a tolerance for gaps)
 */
export function rectsIntersect(a: CollageRect, b: CollageRect, tolerance = 0): boolean {
  return !(
    a.x + a.width + tolerance <= b.x ||
    b.x + b.width + tolerance <= a.x ||
    a.y + a.height + tolerance <= b.y ||
    b.y + b.height + tolerance <= a.y
  )
}

/**
 * Check if a rectangle collides with any existing placements
 */
export function hasCollision(
  rect: CollageRect,
  placements: PlacedImage[],
  excludeId: string,
  gap: number
): boolean {
  for (const p of placements) {
    if (p.imageId === excludeId) continue
    if (rectsIntersect(rect, p.rect, gap)) {
      return true
    }
  }
  return false
}

/**
 * Find the minimum Y position a rect can move to without collision
 */
export function findMinY(
  rect: CollageRect,
  placements: PlacedImage[],
  selfIndex: number,
  gap: number
): number {
  let minY = 0 // Page top

  for (let i = 0; i < placements.length; i++) {
    if (i === selfIndex) continue
    const other = placements[i].rect

    // Check if this placement is above us and horizontally overlapping
    if (other.y + other.height <= rect.y) {
      // Other is above
      const horizOverlap = !(
        rect.x + rect.width + gap <= other.x || other.x + other.width + gap <= rect.x
      )
      if (horizOverlap) {
        // We can't go above this placement
        minY = Math.max(minY, other.y + other.height + gap)
      }
    }
  }

  return minY
}

/**
 * Find the maximum X position a rect can move to without collision
 */
export function findMaxX(
  rect: CollageRect,
  placements: PlacedImage[],
  selfIndex: number,
  gap: number,
  pageWidth: number
): number {
  let maxX = pageWidth - rect.width // Page right edge

  for (let i = 0; i < placements.length; i++) {
    if (i === selfIndex) continue
    const other = placements[i].rect

    // Check if this placement is to our right and vertically overlapping
    if (other.x >= rect.x + rect.width) {
      // Other is to the right
      const vertOverlap = !(
        rect.y + rect.height + gap <= other.y || other.y + other.height + gap <= rect.y
      )
      if (vertOverlap) {
        // We can't go past this placement
        maxX = Math.min(maxX, other.x - rect.width - gap)
      }
    }
  }

  return maxX
}

/**
 * Find the maximum Y position a rect can move to without collision
 */
export function findMaxY(
  rect: CollageRect,
  placements: PlacedImage[],
  selfIndex: number,
  gap: number,
  pageHeight: number
): number {
  let maxY = pageHeight - rect.height // Page bottom

  for (let i = 0; i < placements.length; i++) {
    if (i === selfIndex) continue
    const other = placements[i].rect

    // Check if this placement is below us and horizontally overlapping
    if (other.y >= rect.y + rect.height) {
      // Other is below
      const horizOverlap = !(
        rect.x + rect.width + gap <= other.x || other.x + other.width + gap <= rect.x
      )
      if (horizOverlap) {
        // We can't go below this placement
        maxY = Math.min(maxY, other.y - rect.height - gap)
      }
    }
  }

  return maxY
}

/**
 * Find the minimum X position a rect can move to without collision
 */
export function findMinX(
  rect: CollageRect,
  placements: PlacedImage[],
  selfIndex: number,
  gap: number
): number {
  let minX = 0 // Page left edge

  for (let i = 0; i < placements.length; i++) {
    if (i === selfIndex) continue
    const other = placements[i].rect

    // Check if this placement is to our left and vertically overlapping
    if (other.x + other.width <= rect.x) {
      // Other is to the left
      const vertOverlap = !(
        rect.y + rect.height + gap <= other.y || other.y + other.height + gap <= rect.y
      )
      if (vertOverlap) {
        // We can't go past this placement
        minX = Math.max(minX, other.x + other.width + gap)
      }
    }
  }

  return minX
}

/**
 * Find available space to the right of a rect
 */
export function findSpaceRight(
  rect: CollageRect,
  placements: PlacedImage[],
  selfIndex: number,
  gap: number,
  pageWidth: number
): number {
  let minBlocker = pageWidth

  for (let i = 0; i < placements.length; i++) {
    if (i === selfIndex) continue
    const other = placements[i].rect

    // Check if other is to our right and vertically overlapping
    if (other.x > rect.x + rect.width - gap) {
      const vertOverlap = !(
        rect.y + rect.height + gap <= other.y || other.y + other.height + gap <= rect.y
      )
      if (vertOverlap) {
        minBlocker = Math.min(minBlocker, other.x - gap)
      }
    }
  }

  return minBlocker - (rect.x + rect.width)
}

/**
 * Find available space to the left of a rect
 */
export function findSpaceLeft(
  rect: CollageRect,
  placements: PlacedImage[],
  selfIndex: number,
  gap: number
): number {
  let maxBlocker = 0

  for (let i = 0; i < placements.length; i++) {
    if (i === selfIndex) continue
    const other = placements[i].rect

    // Check if other is to our left and vertically overlapping
    if (other.x + other.width < rect.x + gap) {
      const vertOverlap = !(
        rect.y + rect.height + gap <= other.y || other.y + other.height + gap <= rect.y
      )
      if (vertOverlap) {
        maxBlocker = Math.max(maxBlocker, other.x + other.width + gap)
      }
    }
  }

  return rect.x - maxBlocker
}

/**
 * Find available space below a rect
 */
export function findSpaceBelow(
  rect: CollageRect,
  placements: PlacedImage[],
  selfIndex: number,
  gap: number,
  pageHeight: number
): number {
  let minBlocker = pageHeight

  for (let i = 0; i < placements.length; i++) {
    if (i === selfIndex) continue
    const other = placements[i].rect

    // Check if other is below us and horizontally overlapping
    if (other.y > rect.y + rect.height - gap) {
      const horizOverlap = !(
        rect.x + rect.width + gap <= other.x || other.x + other.width + gap <= rect.x
      )
      if (horizOverlap) {
        minBlocker = Math.min(minBlocker, other.y - gap)
      }
    }
  }

  return minBlocker - (rect.y + rect.height)
}

/**
 * Find available space above a rect
 */
export function findSpaceAbove(
  rect: CollageRect,
  placements: PlacedImage[],
  selfIndex: number,
  gap: number
): number {
  let maxBlocker = 0

  for (let i = 0; i < placements.length; i++) {
    if (i === selfIndex) continue
    const other = placements[i].rect

    // Check if other is above us and horizontally overlapping
    if (other.y + other.height < rect.y + gap) {
      const horizOverlap = !(
        rect.x + rect.width + gap <= other.x || other.x + other.width + gap <= rect.x
      )
      if (horizOverlap) {
        maxBlocker = Math.max(maxBlocker, other.y + other.height + gap)
      }
    }
  }

  return rect.y - maxBlocker
}
