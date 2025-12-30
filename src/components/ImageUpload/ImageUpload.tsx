/**
 * ImageUpload Component
 * Drag-and-drop zone with file picker button
 */

import React, { useRef, useState, useCallback } from 'react'
import { logger } from '@wolffm/task-ui-components'
import type { ImageFile } from '../../domain/types'
import { ACCEPTED_EXTENSIONS, ACCEPTED_IMAGE_TYPES } from '../../domain/constants'
import { ImagePreview } from './ImagePreview'

interface ImageUploadProps {
  /** Controlled image (when using with useImageUpload hook) */
  image?: ImageFile | null
  isLoading?: boolean
  error?: string | null
  onDrop?: (e: React.DragEvent) => Promise<void>
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onClear?: () => void
  label?: string
  /** Simplified callback for standalone usage */
  onImageSelect?: (image: ImageFile | null) => void
  /** Compact mode for secondary uploads */
  compact?: boolean
}

/**
 * Load an image file and extract metadata (for standalone mode)
 */
async function loadImageFile(file: File): Promise<ImageFile> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      reject(new Error(`Unsupported file type: ${file.type}`))
      return
    }

    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        resolve({
          file,
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
          name: file.name
        })
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = dataUrl
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function ImageUpload({
  image,
  isLoading: externalLoading,
  error: externalError,
  onDrop: externalOnDrop,
  onInputChange: externalOnInputChange,
  onClear: externalOnClear,
  label = 'Source Image',
  onImageSelect,
  compact = false
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [internalLoading, setInternalLoading] = useState(false)
  const [internalError, setInternalError] = useState<string | null>(null)

  // Use external state if provided, otherwise internal
  const isLoading = externalLoading ?? internalLoading
  const error = externalError ?? internalError

  // Standalone file handler
  const handleFileStandalone = useCallback(
    async (file: File) => {
      if (!onImageSelect) return
      setInternalLoading(true)
      setInternalError(null)
      try {
        const imageFile = await loadImageFile(file)
        onImageSelect(imageFile)
        logger.info('[ImageUpload] Image loaded (standalone)', { name: imageFile.name })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load image'
        setInternalError(message)
        logger.error('[ImageUpload] Error loading image', { error: message })
      } finally {
        setInternalLoading(false)
      }
    },
    [onImageSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDropAsync = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      if (externalOnDrop) {
        await externalOnDrop(e)
      } else if (onImageSelect) {
        const file = e.dataTransfer.files[0]
        if (file) await handleFileStandalone(file)
      }
    },
    [externalOnDrop, onImageSelect, handleFileStandalone]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      handleDropAsync(e).catch(() => {
        // Error handled in handleFileStandalone
      })
    },
    [handleDropAsync]
  )

  const handleInputChangeAsync = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (externalOnInputChange) {
        await externalOnInputChange(e)
      } else if (onImageSelect) {
        const file = e.target.files?.[0]
        if (file) await handleFileStandalone(file)
      }
      e.target.value = ''
    },
    [externalOnInputChange, onImageSelect, handleFileStandalone]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChangeAsync(e).catch(() => {
        // Error handled in handleFileStandalone
      })
    },
    [handleInputChangeAsync]
  )

  const handleClear = useCallback(() => {
    if (externalOnClear) {
      externalOnClear()
    } else if (onImageSelect) {
      onImageSelect(null)
      setInternalError(null)
    }
  }, [externalOnClear, onImageSelect])

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    },
    [handleClick]
  )

  const containerClass = compact
    ? 'printtool-image-upload printtool-image-upload--compact'
    : 'printtool-image-upload'

  return (
    <div className={containerClass}>
      {!compact && <div className="printtool-image-upload__label">{label}</div>}

      {image ? (
        <ImagePreview
          image={image}
          onClear={handleClear}
          label={compact ? label : undefined}
          compact={compact}
        />
      ) : (
        <div
          className={`printtool-image-upload__dropzone ${
            isDragOver ? 'printtool-image-upload__dropzone--active' : ''
          } ${error ? 'printtool-image-upload__dropzone--error' : ''} ${
            compact ? 'printtool-image-upload__dropzone--compact' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`${label}: Click or drop an image`}
        >
          {isLoading ? (
            <div className="printtool-image-upload__loading">Loading...</div>
          ) : (
            <>
              <div className="printtool-image-upload__icon">
                <svg
                  width={compact ? '32' : '48'}
                  height={compact ? '32' : '48'}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              <div className="printtool-image-upload__text">
                {compact ? label : 'Drop image here or click to select'}
              </div>
              {!compact && (
                <div className="printtool-image-upload__hint">PNG, JPG, TIFF, WebP, BMP</div>
              )}
            </>
          )}
        </div>
      )}

      {error && <div className="printtool-image-upload__error">{error}</div>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleInputChange}
        className="printtool-image-upload__input"
        aria-hidden="true"
      />
    </div>
  )
}
