/**
 * Print Tool Domain Types
 */

import type {
  PAPER_SIZES,
  TILE_SIZES,
  POSITION_OPTIONS,
  CALIBRATION_GRIDS,
  VARIATION_PRESETS
} from './constants'

// ============================================================================
// Image Types
// ============================================================================

export interface ImageFile {
  file: File
  dataUrl: string
  width: number
  height: number
  aspectRatio: number
  name: string
}

// ============================================================================
// Layout Types
// ============================================================================

export interface LayoutInfo {
  cols: number
  rows: number
  count: number
  tileW: number // inches
  tileH: number // inches
  paperW: number // inches
  paperH: number // inches
  paperLandscape: boolean
  tileLandscape: boolean
}

// ============================================================================
// Settings Types
// ============================================================================

export type PaperSizeKey = keyof typeof PAPER_SIZES
export type TileSizeKey = keyof typeof TILE_SIZES
export type PositionOption = (typeof POSITION_OPTIONS)[number]
export type CalibrationGridKey = keyof typeof CALIBRATION_GRIDS
export type VariationPresetKey = keyof typeof VARIATION_PRESETS

export type PrintMode = 'simple' | 'duplex' | 'calibration' | 'collage'

// ============================================================================
// Variation Types
// ============================================================================

export interface Variation {
  readonly label: string
  readonly args: readonly string[]
}

// ============================================================================
// Processing Result Types
// ============================================================================

export interface ProcessedResult {
  frontCanvas: HTMLCanvasElement
  backCanvas?: HTMLCanvasElement // For duplex mode
  tiffDataUrl?: string // For calibration mode - pre-generated TIFF
  layoutInfo: LayoutInfo | null
  filename: string
}

// ============================================================================
// State Types
// ============================================================================

export interface PrintToolState {
  // Mode
  mode: PrintMode

  // Images
  sourceImage: ImageFile | null
  backImage: ImageFile | null // For duplex mode

  // Tiling Settings
  paperSize: PaperSizeKey
  tileSize: TileSizeKey
  dpi: number
  position: PositionOption

  // Calibration Settings
  calibrationGrid: CalibrationGridKey
  calibrationDpi: number
  calibrationPreset: VariationPresetKey
  selectedVariationIndex: number

  // Collage Settings
  collageImages: CollagePoolImage[]
  collageSettings: CollageSettings
  collageResult: CollageLayoutResult | null

  // Processing State
  isProcessing: boolean
  result: ProcessedResult | null
  error: string | null

  // Computed (derived from settings + sourceImage)
  layoutInfo: LayoutInfo | null
}

// ============================================================================
// Action Types
// ============================================================================

export type PrintToolAction =
  | { type: 'SET_MODE'; payload: PrintMode }
  | { type: 'SET_SOURCE_IMAGE'; payload: ImageFile | null }
  | { type: 'SET_BACK_IMAGE'; payload: ImageFile | null }
  | { type: 'SET_PAPER_SIZE'; payload: PaperSizeKey }
  | { type: 'SET_TILE_SIZE'; payload: TileSizeKey }
  | { type: 'SET_DPI'; payload: number }
  | { type: 'SET_POSITION'; payload: PositionOption }
  | { type: 'SET_CALIBRATION_GRID'; payload: CalibrationGridKey }
  | { type: 'SET_CALIBRATION_DPI'; payload: number }
  | { type: 'SET_CALIBRATION_PRESET'; payload: VariationPresetKey }
  | { type: 'SET_SELECTED_VARIATION'; payload: number }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_RESULT'; payload: ProcessedResult | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAYOUT_INFO'; payload: LayoutInfo | null }
  | { type: 'SET_COLLAGE_IMAGES'; payload: CollagePoolImage[] }
  | { type: 'ADD_COLLAGE_IMAGES'; payload: CollagePoolImage[] }
  | { type: 'REMOVE_COLLAGE_IMAGE'; payload: string }
  | { type: 'CLEAR_COLLAGE_IMAGES' }
  | { type: 'SET_COLLAGE_SETTINGS'; payload: Partial<CollageSettings> }
  | { type: 'SET_COLLAGE_RESULT'; payload: CollageLayoutResult | null }
  | { type: 'RESET' }

// ============================================================================
// API Types
// ============================================================================

export interface CalibrationRequest {
  image: string // base64
  paperSize: string
  grid: [number, number]
  dpi: number
  variations: Variation[]
}

export interface CalibrationResponse {
  success: boolean
  data?: {
    image: string // base64 TIFF data URL
    filename: string
    gridSize: [number, number]
    variationCount: number
  }
  error?: string
}

export interface ExportRequest {
  image: string // base64 PNG
  format: 'tiff' | 'png'
  dpi: number
}

export interface ExportResponse {
  success: boolean
  file?: string // base64
  filename?: string
  error?: string
}

// ============================================================================
// Collage Types
// ============================================================================

export type CollageAlgorithm = 'ffd-row' | 'masonry' | 'guillotine' | 'spiral' | 'treemap'
export type CropAnchor =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export interface CollagePoolImage extends ImageFile {
  id: string
  selected: boolean // Whether used in current layout
}

export interface CollageRect {
  x: number
  y: number
  width: number
  height: number // All in inches
}

export interface PlacedImage {
  imageId: string
  rect: CollageRect
  scaleFactor: number
  cropBox?: { sx: number; sy: number; sw: number; sh: number }
  rotated: boolean
}

export interface CollageLayoutResult {
  placements: PlacedImage[]
  coverage: number // 0-1
  unusedImageIds: string[]
  scaleFactor: number
  seed: number
}

export interface CollageSettings {
  algorithm: CollageAlgorithm
  paperSize: PaperSizeKey
  dpi: number
  gapInches: number
  maxDownscalePercent: number // 0-80
  allowCropping: boolean
  maxCropPercent: number // 0-30
  cropAnchor: CropAnchor
  minImageSizeInches: number
  normalizeImageSizes: boolean // Scale larger images down more to normalize sizes
}
