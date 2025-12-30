/**
 * Collage Processing Module
 * Exports all collage-related functionality
 */

export { createCollageCanvas } from './createCollageCanvas'
export type { CollageProgress } from './createCollageCanvas'
export { algorithms, getAlgorithm } from './algorithms'
export { optimizeScaleFactor, imagesToDimensions } from './optimization'
export { SeededRandom, biasedShuffleByArea, generateSeed } from './randomization'
export type {
  ImageDimensions,
  AlgorithmInput,
  AlgorithmOutput,
  CollageAlgorithmFn,
  CreateCollageParams,
  CreateCollageResult
} from './types'
