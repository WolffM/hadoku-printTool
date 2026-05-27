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
/**
 * Common shape every multi-image-pool item has. Mode-specific aliases
 * compose on top so call sites read with intent.
 */
export interface PooledImage {
  id: string
  file: File
  dataUrl: string
  name: string
  width: number
  height: number
}

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

export type PrintMode = 'simple' | 'duplex' | 'calibration' | 'collage' | 'tcg' | 'sticker'

// ============================================================================
// TCG Mode Types
// ============================================================================

/** Input mode for TCG sheets: textarea (Scryfall/CDN lookup) vs. uploaded files. */
export type TcgInputMode = 'list' | 'custom'

/** Which game's CardSource is selected. Mirrors the registry key. */
export type TcgGame = 'mtg' | 'riftbound'

/**
 * Custom-asset image for TCG mode. Structurally identical to PooledImage —
 * the alias keeps mode-specific intent visible at call sites.
 */
export type TcgCustomImage = PooledImage

// ----------------------------------------------------------------------------
// Riftbound deck editor (Riftbound-only sub-flow of TCG mode)
//
// User pastes a decklist, hits "Build Deck Editor", and gets a 3x3 preview
// grid where every card slot has a dropdown to pick the alt-art variant.
// All variant images are pre-fetched on build so the dropdowns are instant.
// ----------------------------------------------------------------------------

/** One card position in the deck order — the unit that becomes a grid slot. */
export interface RiftboundDeckSlot {
  /** Original decklist line (e.g. "3 Plundering Poro") — shown for context. */
  raw: string
  /** Card display name (e.g. "Plundering Poro"); empty for ID-only entries. */
  name: string
  /** All known printing IDs for this name, lowest-numbered first (black-bordered). */
  variants: string[]
  /** Currently chosen variant ID — initial = variants[0]. */
  selectedId: string
}

export interface RiftboundDeck {
  slots: RiftboundDeckSlot[]
  /** Variant ID → data URL. Populated by the pre-fetch step. */
  variantImages: Record<string, string>
}

// ============================================================================
// Sticker Mode Types
// Mirrors the Python StickerMaker --copies / --size / --offset flags.
// ============================================================================

/**
 * Sticker pipeline input. Structurally identical to PooledImage; alias kept
 * for mode-specific intent at call sites.
 */
export type StickerImage = PooledImage

/** Maps to Python --size (1-4). Inches per offset size in main.py:OFFSET_SIZES. */
export type StickerOffsetSize = 1 | 2 | 3 | 4

export interface StickerSettings {
  /** Copies per image (Python --copies, default 1). */
  copies: number
  /** Cutline offset preset (Python --size, default 2 = 0.1"). */
  size: StickerOffsetSize
  /** Custom offset in inches (Python --offset). Overrides `size` when set. */
  customOffsetInches: number | null
  /** Generate the cutline-size sample page instead of a full sheet. */
  testMode: boolean
}

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
  /**
   * Optional multi-sheet output (used by MTG mode when input > 9 cards).
   * First entry matches frontCanvas/backCanvas for backward compatibility.
   */
  sheets?: { front: HTMLCanvasElement; back?: HTMLCanvasElement }[]
  /**
   * Collage layout result — exposed here so the registry can dispatch it
   * into state.collageResult after a collage run.
   */
  collageLayout?: CollageLayoutResult
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

  // TCG Settings
  tcgGame: TcgGame
  tcgInputMode: TcgInputMode
  tcgInput: string
  tcgCustomImages: TcgCustomImage[]
  /** Draw printer's crop marks at every card-edge intersection. */
  tcgCutlines: boolean
  /** Active Riftbound deck-editor session, or null when not in editor view. */
  riftboundDeck: RiftboundDeck | null

  // Sticker Settings
  stickerImages: StickerImage[]
  stickerSettings: StickerSettings

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
  | { type: 'SET_COLLAGE_SETTINGS'; payload: Partial<CollageSettings> }
  | { type: 'SET_COLLAGE_RESULT'; payload: CollageLayoutResult | null }
  | { type: 'SET_TCG_GAME'; payload: TcgGame }
  | { type: 'SET_TCG_INPUT_MODE'; payload: TcgInputMode }
  | { type: 'SET_TCG_INPUT'; payload: string }
  | { type: 'SET_TCG_CUTLINES'; payload: boolean }
  | { type: 'SET_RIFTBOUND_DECK'; payload: RiftboundDeck | null }
  | { type: 'SET_RIFTBOUND_SLOT_VARIANT'; payload: { slotIndex: number; variantId: string } }
  | { type: 'SET_STICKER_SETTINGS'; payload: Partial<StickerSettings> }
  | PoolAction
  | { type: 'RESET' }

/** Modes whose state holds a list of pool images. */
export type PoolKey = 'collageImages' | 'tcgCustomImages' | 'stickerImages'

/**
 * Generic pool-mutation action. One action covers collage/tcg/sticker —
 * the `pool` discriminator selects which list to mutate.
 *
 * Collage has an extra invariant: any mutation clears the cached
 * `collageResult` (a stale layout would now reference dropped image ids).
 * The reducer handles this.
 */
export type PoolAction =
  | { type: 'POOL_ADD'; pool: 'collageImages'; payload: CollagePoolImage[] }
  | { type: 'POOL_ADD'; pool: 'tcgCustomImages'; payload: TcgCustomImage[] }
  | { type: 'POOL_ADD'; pool: 'stickerImages'; payload: StickerImage[] }
  | { type: 'POOL_REMOVE'; pool: PoolKey; payload: string }
  | { type: 'POOL_CLEAR'; pool: PoolKey }

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
