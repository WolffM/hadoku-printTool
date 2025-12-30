/**
 * Collage Processing Types
 * Internal types for collage layout algorithms
 */

import type {
  CollagePoolImage,
  CollageRect,
  PlacedImage,
  CollageSettings,
  CollageLayoutResult
} from '../../types'

/**
 * Simplified image representation for algorithm processing
 */
export interface ImageDimensions {
  id: string
  width: number // inches
  height: number // inches
  area: number // square inches
  aspectRatio: number
}

/**
 * Algorithm input parameters
 */
export interface AlgorithmInput {
  images: ImageDimensions[]
  pageWidth: number // inches
  pageHeight: number // inches
  gapInches: number
  minImageSizeInches: number
  seed: number
}

/**
 * Algorithm output - raw placements
 */
export interface AlgorithmOutput {
  placements: PlacedImage[]
  coverage: number
  unusedImageIds: string[]
}

/**
 * Algorithm function signature
 */
export type CollageAlgorithmFn = (input: AlgorithmInput) => AlgorithmOutput

/**
 * Parameters for creating a collage canvas
 */
export interface CreateCollageParams {
  images: CollagePoolImage[]
  settings: CollageSettings
  seed: number | null // null = generate new random seed
}

/**
 * Result of collage canvas creation
 */
export interface CreateCollageResult {
  canvas: HTMLCanvasElement
  layout: CollageLayoutResult
}

/**
 * Free rectangle for guillotine algorithm
 */
export type FreeRect = CollageRect

export type { CollagePoolImage, CollageRect, PlacedImage, CollageSettings, CollageLayoutResult }
