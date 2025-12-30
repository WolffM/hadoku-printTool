/**
 * Collage Layout Algorithms Index
 */

import type { CollageAlgorithm } from '../../../types'
import type { CollageAlgorithmFn } from '../types'
import { ffdRowAlgorithm } from './ffdRow'
import { masonryAlgorithm } from './masonry'
import { guillotineAlgorithm } from './guillotine'
import { spiralAlgorithm } from './spiral'
import { treemapAlgorithm } from './treemap'

export const algorithms: Record<CollageAlgorithm, CollageAlgorithmFn> = {
  'ffd-row': ffdRowAlgorithm,
  masonry: masonryAlgorithm,
  guillotine: guillotineAlgorithm,
  spiral: spiralAlgorithm,
  treemap: treemapAlgorithm
}

export function getAlgorithm(name: CollageAlgorithm): CollageAlgorithmFn {
  return algorithms[name]
}

export { ffdRowAlgorithm, masonryAlgorithm, guillotineAlgorithm, spiralAlgorithm, treemapAlgorithm }
