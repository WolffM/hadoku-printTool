/**
 * ImagePreview Component
 * Displays an image preview with metadata
 */

import React from 'react'
import type { ImageFile } from '../../domain/types'

interface ImagePreviewProps {
  image: ImageFile
  maxHeight?: number
  showInfo?: boolean
  onClear?: () => void
  label?: string
  compact?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImagePreview({
  image,
  maxHeight = 200,
  showInfo = true,
  onClear,
  label,
  compact = false
}: ImagePreviewProps) {
  const containerClass = compact
    ? 'printtool-image-preview printtool-image-preview--compact'
    : 'printtool-image-preview'

  return (
    <div className={containerClass}>
      {label && compact && <div className="printtool-image-preview__label">{label}</div>}

      <div
        className="printtool-image-preview__container"
        style={{ maxHeight: compact ? 100 : maxHeight }}
      >
        <img src={image.dataUrl} alt={image.name} className="printtool-image-preview__image" />
      </div>

      {showInfo && !compact && (
        <div className="printtool-image-preview__info">
          <span className="printtool-image-preview__name" title={image.name}>
            {image.name}
          </span>
          <span className="printtool-image-preview__dimensions">
            {image.width} × {image.height}
          </span>
          <span className="printtool-image-preview__size">{formatFileSize(image.file.size)}</span>
        </div>
      )}

      {compact && (
        <div className="printtool-image-preview__info printtool-image-preview__info--compact">
          <span className="printtool-image-preview__dimensions">
            {image.width} × {image.height}
          </span>
        </div>
      )}

      {onClear && (
        <button
          type="button"
          className="printtool-image-preview__clear"
          onClick={onClear}
          aria-label="Clear image"
        >
          ×
        </button>
      )}
    </div>
  )
}
