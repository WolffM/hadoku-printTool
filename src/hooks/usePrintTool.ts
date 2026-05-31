/**
 * usePrintTool Hook
 * Main state management for the Print Tool application
 */

import { useReducer, useEffect, useCallback } from 'react'
import { logger } from '@wolffm/logger/client'
import type {
  PrintToolState,
  PrintToolAction,
  PrintMode,
  PaperSizeKey,
  TileSizeKey,
  PositionOption,
  CalibrationGridKey,
  VariationPresetKey,
  ImageFile,
  ProcessedResult,
  CollagePoolImage,
  CollageSettings,
  CollageLayoutResult,
  TcgGame,
  TcgInputMode,
  TcgCustomImage,
  RiftboundDeck,
  StickerImage,
  StickerSettings
} from '../domain/types'
import {
  DEFAULT_PAPER_SIZE,
  DEFAULT_TILE_SIZE,
  DEFAULT_DPI,
  DEFAULT_POSITION,
  DEFAULT_CALIBRATION_GRID,
  DEFAULT_CALIBRATION_DPI,
  DEFAULT_CALIBRATION_PRESET,
  DEFAULT_COLLAGE_SETTINGS,
  DEFAULT_STICKER_SETTINGS,
  PAPER_SIZES,
  TILE_SIZES
} from '../domain/constants'
import { calculateLayout } from '../domain/processing'

// ============================================================================
// Initial State
// ============================================================================

/** Exported for unit tests — also the source for `useReducer`'s initial value. */
export const initialState: PrintToolState = {
  mode: 'simple',
  sourceImage: null,
  backImage: null,
  paperSize: DEFAULT_PAPER_SIZE,
  tileSize: DEFAULT_TILE_SIZE,
  dpi: DEFAULT_DPI,
  position: DEFAULT_POSITION,
  calibrationGrid: DEFAULT_CALIBRATION_GRID,
  calibrationDpi: DEFAULT_CALIBRATION_DPI,
  calibrationPreset: DEFAULT_CALIBRATION_PRESET,
  selectedVariationIndex: 0,
  collageImages: [],
  collageSettings: DEFAULT_COLLAGE_SETTINGS,
  collageResult: null,
  tcgGame: 'mtg',
  tcgInputMode: 'list',
  tcgInput: '',
  tcgCustomImages: [],
  tcgCutlines: true,
  riftboundDeck: null,
  stickerImages: [],
  stickerSettings: DEFAULT_STICKER_SETTINGS,
  isProcessing: false,
  result: null,
  error: null,
  layoutInfo: null
}

// ============================================================================
// Reducer
// ============================================================================

/** Exported for unit tests. Pure function — `useReducer` consumes it inside the hook. */
export function reducer(state: PrintToolState, action: PrintToolAction): PrintToolState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        result: null,
        error: null,
        // Reset position to 'All' when switching to duplex
        position: action.payload === 'duplex' ? 'All' : state.position
      }

    case 'SET_SOURCE_IMAGE':
      return {
        ...state,
        sourceImage: action.payload,
        result: null,
        error: null
      }

    case 'SET_BACK_IMAGE':
      return {
        ...state,
        backImage: action.payload,
        result: null,
        error: null
      }

    case 'SET_PAPER_SIZE':
      return {
        ...state,
        paperSize: action.payload,
        result: null
      }

    case 'SET_TILE_SIZE':
      return {
        ...state,
        tileSize: action.payload,
        result: null
      }

    case 'SET_DPI':
      return {
        ...state,
        dpi: action.payload,
        result: null
      }

    case 'SET_POSITION':
      return {
        ...state,
        position: action.payload,
        result: null
      }

    case 'SET_CALIBRATION_GRID':
      return {
        ...state,
        calibrationGrid: action.payload,
        result: null
      }

    case 'SET_CALIBRATION_DPI':
      return {
        ...state,
        calibrationDpi: action.payload,
        result: null
      }

    case 'SET_CALIBRATION_PRESET':
      return {
        ...state,
        calibrationPreset: action.payload,
        selectedVariationIndex: 0,
        result: null
      }

    case 'SET_SELECTED_VARIATION':
      return {
        ...state,
        selectedVariationIndex: action.payload
      }

    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload
      }

    case 'SET_RESULT':
      return {
        ...state,
        result: action.payload,
        isProcessing: false,
        error: null
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isProcessing: false
      }

    case 'SET_LAYOUT_INFO':
      return {
        ...state,
        layoutInfo: action.payload
      }

    case 'POOL_ADD': {
      const current = state[action.pool]
      // Type assertion: the discriminated union guarantees the payload type
      // matches the pool, but TS can't follow it through the index access.
      const next = [...current, ...action.payload] as typeof current
      return {
        ...state,
        [action.pool]: next,
        result: null,
        ...(action.pool === 'collageImages' ? { collageResult: null } : {})
      }
    }

    case 'POOL_REMOVE': {
      const current = state[action.pool]
      const next = current.filter(img => img.id !== action.payload) as typeof current
      return {
        ...state,
        [action.pool]: next,
        result: null,
        ...(action.pool === 'collageImages' ? { collageResult: null } : {})
      }
    }

    case 'POOL_CLEAR':
      return {
        ...state,
        [action.pool]: [],
        result: null,
        ...(action.pool === 'collageImages' ? { collageResult: null } : {})
      }

    case 'SET_COLLAGE_SETTINGS':
      return {
        ...state,
        collageSettings: { ...state.collageSettings, ...action.payload },
        result: null,
        collageResult: null
      }

    case 'SET_COLLAGE_RESULT':
      return {
        ...state,
        collageResult: action.payload
      }

    case 'SET_TCG_GAME':
      return {
        ...state,
        tcgGame: action.payload,
        result: null,
        error: null
      }

    case 'SET_TCG_INPUT_MODE':
      return {
        ...state,
        tcgInputMode: action.payload,
        result: null,
        error: null
      }

    case 'SET_TCG_INPUT':
      return {
        ...state,
        tcgInput: action.payload,
        result: null
      }

    case 'SET_TCG_CUTLINES':
      return {
        ...state,
        tcgCutlines: action.payload,
        result: null
      }

    case 'SET_RIFTBOUND_DECK':
      return {
        ...state,
        riftboundDeck: action.payload,
        // Clear any prior result so the editor view isn't competing with stale sheets.
        result: action.payload ? null : state.result,
        error: null
      }

    case 'SET_RIFTBOUND_SLOT_VARIANT': {
      if (!state.riftboundDeck) return state
      const { slotIndex, variantId } = action.payload
      const nextSlots = state.riftboundDeck.slots.slice()
      const slot = nextSlots[slotIndex]
      if (!slot || !slot.variants.includes(variantId)) return state
      nextSlots[slotIndex] = { ...slot, selectedId: variantId }
      return {
        ...state,
        riftboundDeck: { ...state.riftboundDeck, slots: nextSlots }
      }
    }

    case 'SET_STICKER_SETTINGS':
      return {
        ...state,
        stickerSettings: { ...state.stickerSettings, ...action.payload },
        result: null
      }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

// ============================================================================
// Hook
// ============================================================================

export function usePrintTool() {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Calculate layout whenever relevant settings change
  useEffect(() => {
    const tileSize = TILE_SIZES[state.tileSize]
    const paperSize = PAPER_SIZES[state.paperSize]
    const sourceAspect = state.sourceImage?.aspectRatio

    const layout = calculateLayout(tileSize, paperSize, sourceAspect)
    dispatch({ type: 'SET_LAYOUT_INFO', payload: layout })

    if (layout) {
      logger.info('[usePrintTool] Layout calculated', {
        cols: layout.cols,
        rows: layout.rows,
        count: layout.count
      })
    }
  }, [state.tileSize, state.paperSize, state.sourceImage?.aspectRatio])

  // Action creators
  const setMode = useCallback((mode: PrintMode) => {
    dispatch({ type: 'SET_MODE', payload: mode })
    logger.info('[usePrintTool] Mode changed', { mode })
  }, [])

  const setSourceImage = useCallback((image: ImageFile | null) => {
    dispatch({ type: 'SET_SOURCE_IMAGE', payload: image })
  }, [])

  const setBackImage = useCallback((image: ImageFile | null) => {
    dispatch({ type: 'SET_BACK_IMAGE', payload: image })
  }, [])

  const setPaperSize = useCallback((size: PaperSizeKey) => {
    dispatch({ type: 'SET_PAPER_SIZE', payload: size })
  }, [])

  const setTileSize = useCallback((size: TileSizeKey) => {
    dispatch({ type: 'SET_TILE_SIZE', payload: size })
  }, [])

  const setDpi = useCallback((dpi: number) => {
    dispatch({ type: 'SET_DPI', payload: dpi })
  }, [])

  const setPosition = useCallback((position: PositionOption) => {
    dispatch({ type: 'SET_POSITION', payload: position })
  }, [])

  const setCalibrationGrid = useCallback((grid: CalibrationGridKey) => {
    dispatch({ type: 'SET_CALIBRATION_GRID', payload: grid })
  }, [])

  const setCalibrationDpi = useCallback((dpi: number) => {
    dispatch({ type: 'SET_CALIBRATION_DPI', payload: dpi })
  }, [])

  const setCalibrationPreset = useCallback((preset: VariationPresetKey) => {
    dispatch({ type: 'SET_CALIBRATION_PRESET', payload: preset })
  }, [])

  const setSelectedVariation = useCallback((index: number) => {
    dispatch({ type: 'SET_SELECTED_VARIATION', payload: index })
  }, [])

  const setProcessing = useCallback((isProcessing: boolean) => {
    dispatch({ type: 'SET_PROCESSING', payload: isProcessing })
  }, [])

  const setResult = useCallback((result: ProcessedResult | null) => {
    dispatch({ type: 'SET_RESULT', payload: result })
  }, [])

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error })
  }, [])

  // Collage action creators (image pool uses generic POOL_*)
  const addCollageImages = useCallback((images: CollagePoolImage[]) => {
    dispatch({ type: 'POOL_ADD', pool: 'collageImages', payload: images })
    logger.info('[usePrintTool] Added collage images', { count: images.length })
  }, [])

  const removeCollageImage = useCallback((id: string) => {
    dispatch({ type: 'POOL_REMOVE', pool: 'collageImages', payload: id })
  }, [])

  const clearCollageImages = useCallback(() => {
    dispatch({ type: 'POOL_CLEAR', pool: 'collageImages' })
    logger.info('[usePrintTool] Cleared collage images')
  }, [])

  const setCollageSettings = useCallback((settings: Partial<CollageSettings>) => {
    dispatch({ type: 'SET_COLLAGE_SETTINGS', payload: settings })
  }, [])

  const setCollageResult = useCallback((result: CollageLayoutResult | null) => {
    dispatch({ type: 'SET_COLLAGE_RESULT', payload: result })
  }, [])

  // TCG action creators
  const setTcgGame = useCallback((game: TcgGame) => {
    dispatch({ type: 'SET_TCG_GAME', payload: game })
    logger.info('[usePrintTool] TCG game changed', { game })
  }, [])

  const setTcgInputMode = useCallback((mode: TcgInputMode) => {
    dispatch({ type: 'SET_TCG_INPUT_MODE', payload: mode })
  }, [])

  const setTcgInput = useCallback((input: string) => {
    dispatch({ type: 'SET_TCG_INPUT', payload: input })
  }, [])

  const setTcgCutlines = useCallback((on: boolean) => {
    dispatch({ type: 'SET_TCG_CUTLINES', payload: on })
  }, [])

  const addTcgCustomImages = useCallback((images: TcgCustomImage[]) => {
    dispatch({ type: 'POOL_ADD', pool: 'tcgCustomImages', payload: images })
    logger.info('[usePrintTool] Added TCG custom images', { count: images.length })
  }, [])

  const removeTcgCustomImage = useCallback((id: string) => {
    dispatch({ type: 'POOL_REMOVE', pool: 'tcgCustomImages', payload: id })
  }, [])

  const clearTcgCustomImages = useCallback(() => {
    dispatch({ type: 'POOL_CLEAR', pool: 'tcgCustomImages' })
  }, [])

  const setRiftboundDeck = useCallback((deck: RiftboundDeck | null) => {
    dispatch({ type: 'SET_RIFTBOUND_DECK', payload: deck })
  }, [])

  const setRiftboundSlotVariant = useCallback((slotIndex: number, variantId: string) => {
    dispatch({ type: 'SET_RIFTBOUND_SLOT_VARIANT', payload: { slotIndex, variantId } })
  }, [])

  // Sticker action creators
  const addStickerImages = useCallback((images: StickerImage[]) => {
    dispatch({ type: 'POOL_ADD', pool: 'stickerImages', payload: images })
    logger.info('[usePrintTool] Added sticker images', { count: images.length })
  }, [])

  const removeStickerImage = useCallback((id: string) => {
    dispatch({ type: 'POOL_REMOVE', pool: 'stickerImages', payload: id })
  }, [])

  const clearStickerImages = useCallback(() => {
    dispatch({ type: 'POOL_CLEAR', pool: 'stickerImages' })
  }, [])

  const setStickerSettings = useCallback((settings: Partial<StickerSettings>) => {
    dispatch({ type: 'SET_STICKER_SETTINGS', payload: settings })
  }, [])

  return {
    state,
    // Actions
    setMode,
    setSourceImage,
    setBackImage,
    setPaperSize,
    setTileSize,
    setDpi,
    setPosition,
    setCalibrationGrid,
    setCalibrationDpi,
    setCalibrationPreset,
    setSelectedVariation,
    setProcessing,
    setResult,
    setError,
    // Collage actions
    addCollageImages,
    removeCollageImage,
    clearCollageImages,
    setCollageSettings,
    setCollageResult,
    // TCG actions
    setTcgGame,
    setTcgInputMode,
    setTcgInput,
    setTcgCutlines,
    addTcgCustomImages,
    removeTcgCustomImage,
    clearTcgCustomImages,
    setRiftboundDeck,
    setRiftboundSlotVariant,
    // Sticker actions
    addStickerImages,
    removeStickerImage,
    clearStickerImages,
    setStickerSettings
  }
}
