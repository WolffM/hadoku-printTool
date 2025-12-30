import React, { useRef, useState, useCallback, useMemo } from 'react'
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
import { ResultPreview } from './components/Preview/ResultPreview'
import { ActionButtons } from './components/Actions/ActionButtons'

// Processing
import { createTiledCanvas, createDuplexSheets } from './domain/processing'

export default function App(props: PrintToolProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect system preference for loading skeleton
  const [systemPrefersDark] = useState(() => {
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

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
    canProcess
  } = usePrintTool()

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
    if (!state.sourceImage || !state.layoutInfo) {
      setError('No image or layout available')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Load the source image element
      const sourceImg = new Image()
      await new Promise<void>((resolve, reject) => {
        sourceImg.onload = () => resolve()
        sourceImg.onerror = () => reject(new Error('Failed to load source image'))
        sourceImg.src = state.sourceImage!.dataUrl
      })

      if (state.mode === 'simple') {
        // Simple tiling
        const frontCanvas = await createTiledCanvas({
          sourceImage: sourceImg,
          layout: state.layoutInfo,
          dpi: state.dpi,
          position: state.position
        })

        setResult({
          frontCanvas,
          layoutInfo: state.layoutInfo,
          filename: `${state.sourceImage.name.replace(/\.[^/.]+$/, '')}_tiled`
        })

        logger.info('[App] Simple tiling complete')
      } else if (state.mode === 'duplex') {
        // Duplex mode
        if (!state.backImage) {
          setError('Back image is required for duplex mode')
          return
        }

        const backImg = new Image()
        await new Promise<void>((resolve, reject) => {
          backImg.onload = () => resolve()
          backImg.onerror = () => reject(new Error('Failed to load back image'))
          backImg.src = state.backImage!.dataUrl
        })

        const { frontCanvas, backCanvas } = await createDuplexSheets({
          frontImage: sourceImg,
          backImage: backImg,
          layout: state.layoutInfo,
          dpi: state.dpi
        })

        setResult({
          frontCanvas,
          backCanvas,
          layoutInfo: state.layoutInfo,
          filename: `${state.sourceImage.name.replace(/\.[^/.]+$/, '')}_duplex`
        })

        logger.info('[App] Duplex processing complete')
      } else if (state.mode === 'calibration') {
        // Calibration mode - requires backend API
        setError('Calibration mode requires backend API (not available in demo)')
        logger.warn('[App] Calibration mode not yet implemented - requires backend')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Processing failed'
      setError(message)
      logger.error('[App] Processing error', { error: message })
    } finally {
      setProcessing(false)
    }
  }, [state, setProcessing, setResult, setError])

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

          <ConnectedThemePicker
            themeFamilies={THEME_FAMILIES}
            currentTheme={theme}
            onThemeChange={setTheme}
            getThemeIcon={(themeName: string) => {
              const Icon = THEME_ICON_MAP[themeName as keyof typeof THEME_ICON_MAP]
              return Icon ? <Icon /> : null
            }}
          />
        </header>

        <main className="printtool__content">
          <ModeSelector mode={state.mode} onModeChange={setMode} />

          <div className="printtool__layout">
            <div className="printtool__sidebar">
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
            </div>

            <div className="printtool__main">
              <ResultPreview result={state.result} mode={state.mode} />

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
    </div>
  )
}
