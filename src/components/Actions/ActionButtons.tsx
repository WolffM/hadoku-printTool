/**
 * ActionButtons Component
 * Process and Download buttons for the Print Tool
 */

import React, { useState } from 'react'
import { logger } from '@wolffm/task-ui-components'
import type { PrintMode, ProcessedResult } from '../../domain/types'
import {
  downloadCanvasAsPng,
  exportToTiff,
  canvasToBase64,
  downloadBase64File
} from '../../api/printToolApi'

interface ActionButtonsProps {
  mode: PrintMode
  canProcess: boolean
  isProcessing: boolean
  result: ProcessedResult | null
  dpi: number
  onProcess: () => Promise<void>
  onError: (error: string) => void
}

export function ActionButtons({
  mode,
  canProcess,
  isProcessing,
  result,
  dpi,
  onProcess,
  onError
}: ActionButtonsProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleProcess = async () => {
    try {
      await onProcess()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Processing failed'
      onError(message)
    }
  }

  const handleDownloadPng = (canvas: HTMLCanvasElement, suffix = '') => {
    const filename = result?.filename
      ? `${result.filename}${suffix}.png`
      : `print-output${suffix}.png`
    downloadCanvasAsPng(canvas, filename)
    logger.info('[ActionButtons] PNG downloaded', { filename })
  }

  const handleDownloadTiff = async (canvas: HTMLCanvasElement, suffix = '') => {
    setIsExporting(true)
    try {
      const base64 = canvasToBase64(canvas)
      const response = await exportToTiff(base64, dpi)

      if (response.success && response.file) {
        const filename = response.filename || `print-output${suffix}.tif`
        downloadBase64File(response.file, filename, 'image/tiff')
        logger.info('[ActionButtons] TIFF downloaded', { filename })
      } else {
        throw new Error(response.error || 'Failed to export TIFF')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'TIFF export failed'
      onError(message)
      logger.error('[ActionButtons] TIFF export failed', { error: message })
    } finally {
      setIsExporting(false)
    }
  }

  const isDuplex = mode === 'duplex' && result?.backCanvas

  const onProcessClick = () => {
    handleProcess().catch(() => {
      // Error handled in handleProcess
    })
  }

  const onTiffDownloadClick = (canvas: HTMLCanvasElement, suffix: string) => {
    handleDownloadTiff(canvas, suffix).catch(() => {
      // Error handled in handleDownloadTiff
    })
  }

  return (
    <div className="printtool-actions">
      <div className="printtool-actions__process">
        <button
          type="button"
          className="printtool-actions__button printtool-actions__button--primary"
          onClick={onProcessClick}
          disabled={!canProcess || isProcessing}
        >
          {isProcessing ? (
            <>
              <span className="printtool-actions__spinner" />
              Processing...
            </>
          ) : (
            'Process'
          )}
        </button>
      </div>

      {result && (
        <div className="printtool-actions__downloads">
          <div className="printtool-actions__download-group">
            <span className="printtool-actions__download-label">
              {isDuplex ? 'Front Sheet' : 'Download'}
            </span>
            <div className="printtool-actions__download-buttons">
              <button
                type="button"
                className="printtool-actions__button printtool-actions__button--secondary"
                onClick={() => handleDownloadPng(result.frontCanvas, isDuplex ? '-front' : '')}
                disabled={isExporting}
              >
                PNG
              </button>
              <button
                type="button"
                className="printtool-actions__button printtool-actions__button--secondary"
                onClick={() => onTiffDownloadClick(result.frontCanvas, isDuplex ? '-front' : '')}
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : 'TIFF'}
              </button>
            </div>
          </div>

          {isDuplex && result.backCanvas && (
            <div className="printtool-actions__download-group">
              <span className="printtool-actions__download-label">Back Sheet</span>
              <div className="printtool-actions__download-buttons">
                <button
                  type="button"
                  className="printtool-actions__button printtool-actions__button--secondary"
                  onClick={() => handleDownloadPng(result.backCanvas!, '-back')}
                  disabled={isExporting}
                >
                  PNG
                </button>
                <button
                  type="button"
                  className="printtool-actions__button printtool-actions__button--secondary"
                  onClick={() => onTiffDownloadClick(result.backCanvas!, '-back')}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'TIFF'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
