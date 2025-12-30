import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { ConnectedThemePicker, LoadingSkeleton, logger } from '@wolffm/task-ui-components'
import { THEME_ICON_MAP } from '@wolffm/themes'
import { useTheme } from './hooks/useTheme'
import { usePrintTool } from './hooks/usePrintTool'
import { useImageUpload } from './hooks/useImageUpload'
import type { PrintToolProps } from './entry'

// Components
import { ModeSelector } from './components/ModeSelector/ModeSelector'
import { ImageUpload } from './components/ImageUpload/ImageUpload'
import { TilingSettings } from './components/Settings/TilingSettings'
import { DuplexSettings } from './components/Settings/DuplexSettings'
import { CalibrationSettings } from './components/Settings/CalibrationSettings'
import { CollageSettings } from './components/Settings/CollageSettings'
import { CollageImagePool } from './components/ImageUpload/CollageImagePool'
import { ResultPreview } from './components/Preview/ResultPreview'
import { ActionButtons } from './components/Actions/ActionButtons'
import { ApiStatus, type ApiStatusState } from './components/ApiStatus/ApiStatus'
import { ProgressBar } from './components/Progress/ProgressBar'
import { ProcessingOverlay, type ProcessingProgress } from './components/Progress/ProcessingOverlay'

// Processing
import { createTiledCanvas, createDuplexSheets } from './domain/processing'
import { createCollageCanvas, type CollageProgress } from './domain/processing/collage'
import { VARIATION_PRESETS, CALIBRATION_GRIDS } from './domain/constants'
import {
  generateCalibrationSheet,
  checkApiHealth,
  tiffToCanvas,
  type CalibrationProgress
} from './api/printToolApi'

export default function App(props: PrintToolProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect system preference for loading skeleton
  const [systemPrefersDark] = useState(() => {
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  // API status state
  const [apiStatus, setApiStatus] = useState<ApiStatusState>('checking')

  // Check API health on mount
  const checkHealth = useCallback(async () => {
    setApiStatus('checking')
    const isHealthy = await checkApiHealth()
    setApiStatus(isHealthy ? 'online' : 'offline')
    logger.info('[App] API health check', { status: isHealthy ? 'online' : 'offline' })
  }, [])

  const handleRetryHealth = useCallback(() => {
    checkHealth().catch(() => {
      // Error handled in checkHealth
    })
  }, [checkHealth])

  useEffect(() => {
    void checkHealth()
  }, [checkHealth])

  const { theme, setTheme, isDarkTheme, isThemeReady, isInitialThemeLoad, THEME_FAMILIES } =
    useTheme({
      propsTheme: props.theme,
      experimentalThemes: false,
      containerRef
    })

  // Print Tool state
  const {
    state,
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
    addCollageImages,
    removeCollageImage,
    clearCollageImages,
    setCollageSettings,
    setCollageResult,
    canProcess
  } = usePrintTool()

  // Calibration progress state
  const [calibrationProgress, setCalibrationProgress] = useState<CalibrationProgress | null>(null)

  // General processing progress state
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)

  // Source image upload handler
  const sourceUpload = useImageUpload()

  // Sync source upload with print tool state
  const handleSourceImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      await sourceUpload.handleInputChange(e)
    },
    [sourceUpload]
  )

  const handleSourceDrop = useCallback(
    async (e: React.DragEvent) => {
      await sourceUpload.handleDrop(e)
    },
    [sourceUpload]
  )

  const handleSourceClear = useCallback(() => {
    sourceUpload.clear()
    setSourceImage(null)
  }, [sourceUpload, setSourceImage])

  // Update print tool state when source image changes
  React.useEffect(() => {
    setSourceImage(sourceUpload.image)
  }, [sourceUpload.image, setSourceImage])

  // Get front image orientation for duplex mode
  const frontImageOrientation = useMemo(() => {
    if (!state.sourceImage) return undefined
    return state.sourceImage.width < state.sourceImage.height ? 'portrait' : 'landscape'
  }, [state.sourceImage])

  // Process handler
  const handleProcess = useCallback(async () => {
    // Collage mode has different requirements
    if (state.mode === 'collage') {
      if (state.collageImages.length === 0) {
        setError('No images in pool')
        return
      }
    } else if (!state.sourceImage) {
      setError('No image available')
      return
    }

    // Tiling modes need layout
    if (state.mode !== 'calibration' && state.mode !== 'collage' && !state.layoutInfo) {
      setError('No layout available')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Collage mode processing
      if (state.mode === 'collage') {
        setProcessingProgress({ step: 0, total: 1, message: 'Starting collage generation...' })

        const result = await createCollageCanvas(
          {
            images: state.collageImages,
            settings: state.collageSettings,
            seed: null // Generate new random arrangement
          },
          (progress: CollageProgress) => {
            setProcessingProgress({
              step: progress.step,
              total: progress.total,
              message: progress.message
            })
          }
        )

        setProcessingProgress(null)
        setCollageResult(result.layout)
        setResult({
          frontCanvas: result.canvas,
          layoutInfo: null,
          filename: `collage_${state.collageSettings.algorithm}`
        })

        logger.info('[App] Collage generated', {
          coverage: Math.round(result.layout.coverage * 100) + '%',
          placed: result.layout.placements.length,
          unused: result.layout.unusedImageIds.length
        })
        return
      }

      // Load the source image element
      const sourceImg = new Image()
      await new Promise<void>((resolve, reject) => {
        sourceImg.onload = () => resolve()
        sourceImg.onerror = () => reject(new Error('Failed to load source image'))
        sourceImg.src = state.sourceImage!.dataUrl
      })

      if (state.mode === 'simple') {
        // Simple tiling
        setProcessingProgress({ step: 0, total: 1, message: 'Generating tiled sheet...' })

        const frontCanvas = await createTiledCanvas({
          sourceImage: sourceImg,
          layout: state.layoutInfo!,
          dpi: state.dpi,
          position: state.position
        })

        setProcessingProgress(null)
        setResult({
          frontCanvas,
          layoutInfo: state.layoutInfo,
          filename: `${state.sourceImage!.name.replace(/\.[^/.]+$/, '')}_tiled`
        })

        logger.info('[App] Simple tiling complete')
      } else if (state.mode === 'duplex') {
        // Duplex mode
        if (!state.backImage) {
          setError('Back image is required for duplex mode')
          return
        }

        setProcessingProgress({ step: 0, total: 2, message: 'Loading back image...' })

        const backImg = new Image()
        await new Promise<void>((resolve, reject) => {
          backImg.onload = () => resolve()
          backImg.onerror = () => reject(new Error('Failed to load back image'))
          backImg.src = state.backImage!.dataUrl
        })

        setProcessingProgress({ step: 1, total: 2, message: 'Generating duplex sheets...' })

        const { frontCanvas, backCanvas } = await createDuplexSheets({
          frontImage: sourceImg,
          backImage: backImg,
          layout: state.layoutInfo!,
          dpi: state.dpi
        })

        setProcessingProgress(null)
        setResult({
          frontCanvas,
          backCanvas,
          layoutInfo: state.layoutInfo,
          filename: `${state.sourceImage!.name.replace(/\.[^/.]+$/, '')}_duplex`
        })

        logger.info('[App] Duplex processing complete')
      } else if (state.mode === 'calibration') {
        // Calibration mode - uses backend ImageMagick server
        const preset = VARIATION_PRESETS[state.calibrationPreset]
        const grid = CALIBRATION_GRIDS[state.calibrationGrid]

        // Check backend health first
        const isHealthy = await checkApiHealth()
        if (!isHealthy) {
          throw new Error(
            'Local processing server is offline. Start it with: cd hadoku-printTool && pnpm local:start'
          )
        }

        // Reset progress state
        setCalibrationProgress(null)

        // Call calibration API with progress callback
        const response = await generateCalibrationSheet(
          state.sourceImage!.dataUrl,
          'Letter',
          [...grid] as [number, number], // Convert readonly to mutable tuple
          state.calibrationDpi,
          [...preset], // Convert readonly to mutable array
          progress => setCalibrationProgress(progress)
        )

        // Clear progress when done
        setCalibrationProgress(null)

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Calibration failed')
        }

        // Convert TIFF to displayable canvas for preview
        const previewCanvas = await tiffToCanvas(response.data.image)

        setResult({
          frontCanvas: previewCanvas,
          tiffDataUrl: response.data.image,
          layoutInfo: null,
          filename: `calibration_${state.calibrationPreset.replace(/\s+/g, '_')}`
        })

        logger.info('[App] Calibration sheet generated')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Processing failed'
      setError(message)
      logger.error('[App] Processing error', { error: message })
    } finally {
      setProcessing(false)
      setProcessingProgress(null)
    }
  }, [state, setProcessing, setResult, setError, setCollageResult])

  // Show loading skeleton during initial theme load
  if (isInitialThemeLoad && !isThemeReady) {
    return <LoadingSkeleton isDarkTheme={systemPrefersDark} />
  }

  return (
    <div
      ref={containerRef}
      className="printtool-container"
      data-theme={theme}
      data-dark-theme={isDarkTheme ? 'true' : 'false'}
    >
      <div className="printtool">
        <header className="printtool__header">
          <h1>Hadoku Print Tool</h1>

          <div className="printtool__header-actions">
            <ApiStatus status={apiStatus} onRetry={handleRetryHealth} />

            <ConnectedThemePicker
              themeFamilies={THEME_FAMILIES}
              currentTheme={theme}
              onThemeChange={setTheme}
              getThemeIcon={(themeName: string) => {
                const Icon = THEME_ICON_MAP[themeName as keyof typeof THEME_ICON_MAP]
                return Icon ? <Icon /> : null
              }}
            />
          </div>
        </header>

        <main className="printtool__content">
          <ModeSelector mode={state.mode} onModeChange={setMode} />

          <div className="printtool__layout">
            <div className="printtool__sidebar">
              {/* Collage mode has its own image pool */}
              {state.mode === 'collage' ? (
                <>
                  <CollageImagePool
                    images={state.collageImages}
                    layoutResult={state.collageResult}
                    onAddImages={addCollageImages}
                    onRemoveImage={removeCollageImage}
                    onClearAll={clearCollageImages}
                  />
                  <CollageSettings settings={state.collageSettings} onChange={setCollageSettings} />
                </>
              ) : (
                <>
                  <ImageUpload
                    image={sourceUpload.image}
                    isLoading={sourceUpload.isLoading}
                    error={sourceUpload.error}
                    onDrop={handleSourceDrop}
                    onInputChange={handleSourceImageChange}
                    onClear={handleSourceClear}
                    label="Source Image"
                  />

                  {state.mode !== 'calibration' && (
                    <TilingSettings
                      paperSize={state.paperSize}
                      tileSize={state.tileSize}
                      dpi={state.dpi}
                      position={state.position}
                      layoutInfo={state.layoutInfo}
                      disablePosition={state.mode === 'duplex'}
                      onPaperSizeChange={setPaperSize}
                      onTileSizeChange={setTileSize}
                      onDpiChange={setDpi}
                      onPositionChange={setPosition}
                    />
                  )}

                  {state.mode === 'duplex' && (
                    <DuplexSettings
                      backImage={state.backImage}
                      onBackImageChange={setBackImage}
                      frontImageOrientation={frontImageOrientation}
                    />
                  )}

                  {state.mode === 'calibration' && (
                    <CalibrationSettings
                      calibrationGrid={state.calibrationGrid}
                      calibrationDpi={state.calibrationDpi}
                      calibrationPreset={state.calibrationPreset}
                      selectedVariationIndex={state.selectedVariationIndex}
                      sourceImageUrl={state.sourceImage?.dataUrl}
                      onGridChange={setCalibrationGrid}
                      onDpiChange={setCalibrationDpi}
                      onPresetChange={setCalibrationPreset}
                      onVariationSelect={setSelectedVariation}
                    />
                  )}
                </>
              )}
            </div>

            <div className="printtool__main">
              <ResultPreview result={state.result} mode={state.mode} />

              {calibrationProgress && (
                <ProgressBar
                  step={calibrationProgress.step}
                  total={calibrationProgress.total}
                  message={calibrationProgress.message}
                />
              )}

              {state.error && <div className="printtool__error">{state.error}</div>}

              <ActionButtons
                mode={state.mode}
                canProcess={canProcess}
                isProcessing={state.isProcessing}
                result={state.result}
                dpi={state.mode === 'calibration' ? state.calibrationDpi : state.dpi}
                onProcess={handleProcess}
                onError={setError}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Processing overlay - outside .printtool for proper z-index stacking */}
      <ProcessingOverlay
        isVisible={state.isProcessing}
        progress={processingProgress}
        title={state.mode === 'collage' ? 'Generating Collage...' : 'Processing...'}
      />
    </div>
  )
}
