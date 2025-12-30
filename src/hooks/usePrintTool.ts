/**
 * usePrintTool Hook
 * Main state management for the Print Tool application
 */

import { useReducer, useEffect, useCallback, useMemo } from 'react'
import { logger } from '@wolffm/task-ui-components'
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
  CollageLayoutResult
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
  PAPER_SIZES,
  TILE_SIZES
} from '../domain/constants'
import { calculateLayout } from '../domain/processing'

// ============================================================================
// Initial State
// ============================================================================

const initialState: PrintToolState = {
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
  isProcessing: false,
  result: null,
  error: null,
  layoutInfo: null
}

// ============================================================================
// Reducer
// ============================================================================

function reducer(state: PrintToolState, action: PrintToolAction): PrintToolState {
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

    case 'SET_COLLAGE_IMAGES':
      return {
        ...state,
        collageImages: action.payload,
        result: null,
        collageResult: null
      }

    case 'ADD_COLLAGE_IMAGES':
      return {
        ...state,
        collageImages: [...state.collageImages, ...action.payload],
        result: null,
        collageResult: null
      }

    case 'REMOVE_COLLAGE_IMAGE':
      return {
        ...state,
        collageImages: state.collageImages.filter(img => img.id !== action.payload),
        result: null,
        collageResult: null
      }

    case 'CLEAR_COLLAGE_IMAGES':
      return {
        ...state,
        collageImages: [],
        result: null,
        collageResult: null
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

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
    logger.info('[usePrintTool] State reset')
  }, [])

  // Collage action creators
  const setCollageImages = useCallback((images: CollagePoolImage[]) => {
    dispatch({ type: 'SET_COLLAGE_IMAGES', payload: images })
  }, [])

  const addCollageImages = useCallback((images: CollagePoolImage[]) => {
    dispatch({ type: 'ADD_COLLAGE_IMAGES', payload: images })
    logger.info('[usePrintTool] Added collage images', { count: images.length })
  }, [])

  const removeCollageImage = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_COLLAGE_IMAGE', payload: id })
  }, [])

  const clearCollageImages = useCallback(() => {
    dispatch({ type: 'CLEAR_COLLAGE_IMAGES' })
    logger.info('[usePrintTool] Cleared collage images')
  }, [])

  const setCollageSettings = useCallback((settings: Partial<CollageSettings>) => {
    dispatch({ type: 'SET_COLLAGE_SETTINGS', payload: settings })
  }, [])

  const setCollageResult = useCallback((result: CollageLayoutResult | null) => {
    dispatch({ type: 'SET_COLLAGE_RESULT', payload: result })
  }, [])

  // Validation helpers
  const canProcess = useMemo(() => {
    // Collage mode needs at least one image in the pool
    if (state.mode === 'collage') {
      return state.collageImages.length > 0
    }
    if (!state.sourceImage) return false
    // Calibration mode doesn't need layout - it uses its own grid
    if (state.mode === 'calibration') return true
    // Tiling modes need layout
    if (!state.layoutInfo) return false
    if (state.mode === 'duplex' && !state.backImage) return false
    return true
  }, [state.sourceImage, state.backImage, state.layoutInfo, state.mode, state.collageImages.length])

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
    reset,
    // Collage actions
    setCollageImages,
    addCollageImages,
    removeCollageImage,
    clearCollageImages,
    setCollageSettings,
    setCollageResult,
    // Helpers
    canProcess
  }
}
