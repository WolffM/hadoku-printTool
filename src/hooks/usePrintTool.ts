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
  ProcessedResult
} from '../domain/types'
import {
  DEFAULT_PAPER_SIZE,
  DEFAULT_TILE_SIZE,
  DEFAULT_DPI,
  DEFAULT_POSITION,
  DEFAULT_CALIBRATION_GRID,
  DEFAULT_CALIBRATION_DPI,
  DEFAULT_CALIBRATION_PRESET,
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

  // Validation helpers
  const canProcess = useMemo(() => {
    if (!state.sourceImage) return false
    if (!state.layoutInfo) return false
    if (state.mode === 'duplex' && !state.backImage) return false
    return true
  }, [state.sourceImage, state.backImage, state.layoutInfo, state.mode])

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
    // Helpers
    canProcess
  }
}
