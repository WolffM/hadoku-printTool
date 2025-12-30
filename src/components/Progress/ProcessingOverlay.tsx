/**
 * ProcessingOverlay Component
 * Full-screen overlay with spinner and progress for processing operations
 */

import React from 'react'

export interface ProcessingProgress {
  step: number
  total: number
  message: string
}

interface ProcessingOverlayProps {
  isVisible: boolean
  progress?: ProcessingProgress | null
  title?: string
}

export function ProcessingOverlay({
  isVisible,
  progress,
  title = 'Processing...'
}: ProcessingOverlayProps) {
  if (!isVisible) return null

  const percentage =
    progress && progress.total > 0 ? Math.round((progress.step / progress.total) * 100) : 0

  return (
    <div className="printtool-processing-overlay">
      <div className="printtool-processing-overlay__content">
        <div className="printtool-processing-overlay__spinner" />
        <h3 className="printtool-processing-overlay__title">{title}</h3>
        {progress && (
          <div className="printtool-processing-overlay__progress">
            <span className="printtool-processing-overlay__message">{progress.message}</span>
            <div className="printtool-processing-overlay__bar">
              <div
                className="printtool-processing-overlay__fill"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="printtool-processing-overlay__stats">
              {progress.step} / {progress.total} ({percentage}%)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProcessingOverlay
