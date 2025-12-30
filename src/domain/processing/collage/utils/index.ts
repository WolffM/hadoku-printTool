/**
 * Collage Utility Functions
 * Re-exports all shared utilities for collage algorithms
 */

export {
  rectsIntersect,
  hasCollision,
  findMinY,
  findMaxY,
  findMinX,
  findMaxX,
  findSpaceRight,
  findSpaceLeft,
  findSpaceBelow,
  findSpaceAbove
} from './rectUtils'

export { filterValidImages, calculateCoverage, createEmptyOutput } from './algorithmHelpers'
