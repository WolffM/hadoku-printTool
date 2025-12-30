/**
 * ResultPreview Component
 * Displays the processed output canvas with front/back toggle for duplex
 */

import React, { useState, useEffect, useRef } from 'react'
import type { ProcessedResult, PrintMode } from '../../domain/types'

interface ResultPreviewProps {
  result: ProcessedResult | null
  mode: PrintMode
}

export function ResultPreview({ result, mode }: ResultPreviewProps) {
  const [showBack, setShowBack] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const isDuplex = mode === 'duplex' && result?.backCanvas

  // Draw the result canvas to the preview canvas
  useEffect(() => {
    if (!result || !canvasRef.current) return

    const sourceCanvas = showBack && result.backCanvas ? result.backCanvas : result.frontCanvas
    const previewCanvas = canvasRef.current
    const ctx = previewCanvas.getContext('2d')

    if (!ctx) return

    // Calculate preview dimensions (fit within container while maintaining aspect ratio)
    const maxWidth = 600
    const maxHeight = 400
    const aspectRatio = sourceCanvas.width / sourceCanvas.height

    let previewWidth = maxWidth
    let previewHeight = maxWidth / aspectRatio

    if (previewHeight > maxHeight) {
      previewHeight = maxHeight
      previewWidth = maxHeight * aspectRatio
    }

    previewCanvas.width = previewWidth
    previewCanvas.height = previewHeight

    // Draw scaled preview
    ctx.drawImage(sourceCanvas, 0, 0, previewWidth, previewHeight)
  }, [result, showBack])

  if (!result) {
    return (
      <div className="printtool-result-preview printtool-result-preview--empty">
        <div className="printtool-result-preview__placeholder">
          <p>Process an image to see the result</p>
        </div>
      </div>
    )
  }

  return (
    <div className="printtool-result-preview">
      {isDuplex && (
        <div className="printtool-result-preview__toggle">
          <button
            type="button"
            className={`printtool-result-preview__toggle-btn ${
              !showBack ? 'printtool-result-preview__toggle-btn--active' : ''
            }`}
            onClick={() => setShowBack(false)}
          >
            Front
          </button>
          <button
            type="button"
            className={`printtool-result-preview__toggle-btn ${
              showBack ? 'printtool-result-preview__toggle-btn--active' : ''
            }`}
            onClick={() => setShowBack(true)}
          >
            Back
          </button>
        </div>
      )}

      <div className="printtool-result-preview__canvas-container">
        <canvas ref={canvasRef} className="printtool-result-preview__canvas" />
      </div>

      {(result.layoutInfo || isDuplex) && (
        <div className="printtool-result-preview__info">
          {result.layoutInfo && (
            <>
              <span>
                {result.layoutInfo.paperW}" × {result.layoutInfo.paperH}"
              </span>
              <span>
                {result.layoutInfo.count} tiles ({result.layoutInfo.cols}×{result.layoutInfo.rows})
              </span>
            </>
          )}
          {isDuplex && <span>{showBack ? 'Back Sheet' : 'Front Sheet'}</span>}
        </div>
      )}
    </div>
  )
}
