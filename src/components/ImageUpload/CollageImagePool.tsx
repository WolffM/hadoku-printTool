/**
 * CollageImagePool Component
 * Multi-image upload and management for collage mode
 */

import React, { useCallback, useRef, useState } from 'react'
import { logger } from '@wolffm/task-ui-components'
import type { CollagePoolImage, CollageLayoutResult } from '../../domain/types'
import { ACCEPTED_EXTENSIONS, ACCEPTED_IMAGE_TYPES } from '../../domain/constants'

interface CollageImagePoolProps {
  images: CollagePoolImage[]
  layoutResult: CollageLayoutResult | null
  onAddImages: (images: CollagePoolImage[]) => void
  onRemoveImage: (id: string) => void
  onClearAll: () => void
}

export function CollageImagePool({
  images,
  layoutResult,
  onAddImages,
  onRemoveImage,
  onClearAll
}: CollageImagePoolProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropzoneRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })

  const handleFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files).filter(file => ACCEPTED_IMAGE_TYPES.includes(file.type))

      if (fileArray.length === 0) {
        logger.warn('[CollageImagePool] No supported files found')
        return
      }

      setIsLoading(true)
      setLoadingProgress({ current: 0, total: fileArray.length })

      const newImages: CollagePoolImage[] = []

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        setLoadingProgress({ current: i + 1, total: fileArray.length })

        try {
          const dataUrl = await readFileAsDataUrl(file)
          const dimensions = await getImageDimensions(dataUrl)

          const poolImage: CollagePoolImage = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            file,
            dataUrl,
            width: dimensions.width,
            height: dimensions.height,
            aspectRatio: dimensions.width / dimensions.height,
            name: file.name,
            selected: false
          }

          newImages.push(poolImage)
        } catch (err) {
          logger.error('[CollageImagePool] Failed to load image', {
            name: file.name,
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }

      if (newImages.length > 0) {
        onAddImages(newImages)
      }

      setIsLoading(false)
      setLoadingProgress({ current: 0, total: 0 })
    },
    [onAddImages]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dropzoneRef.current?.classList.remove('printtool-collage-pool__dropzone--dragover')

      if (e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dropzoneRef.current?.classList.add('printtool-collage-pool__dropzone--dragover')
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dropzoneRef.current?.classList.remove('printtool-collage-pool__dropzone--dragover')
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void handleFiles(e.target.files)
        // Reset input so the same files can be selected again
        e.target.value = ''
      }
    },
    [handleFiles]
  )

  const handleAddClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Get usage stats
  const usedCount = layoutResult?.placements.length ?? 0
  const unusedCount = layoutResult?.unusedImageIds.length ?? 0
  const coverage = layoutResult ? Math.round(layoutResult.coverage * 100) : 0

  return (
    <div className="printtool-collage-pool">
      <div className="printtool-collage-pool__header">
        <h3 className="printtool-collage-pool__title">
          Image Pool ({images.length} {images.length === 1 ? 'image' : 'images'})
        </h3>
        {images.length > 0 && (
          <button type="button" className="printtool-collage-pool__clear-btn" onClick={onClearAll}>
            Clear All
          </button>
        )}
      </div>

      {/* Stats (shown after processing) */}
      {layoutResult && (
        <div className="printtool-collage-pool__stats">
          <span className="printtool-collage-pool__stat printtool-collage-pool__stat--used">
            {usedCount} used
          </span>
          {unusedCount > 0 && (
            <span className="printtool-collage-pool__stat printtool-collage-pool__stat--unused">
              {unusedCount} didn't fit
            </span>
          )}
          <span className="printtool-collage-pool__stat printtool-collage-pool__stat--coverage">
            {coverage}% coverage
          </span>
        </div>
      )}

      {/* Dropzone */}
      <div
        ref={dropzoneRef}
        className={`printtool-collage-pool__dropzone ${isLoading ? 'printtool-collage-pool__dropzone--loading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={isLoading ? undefined : handleAddClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          className="printtool-collage-pool__input"
          onChange={handleInputChange}
          disabled={isLoading}
        />
        {isLoading ? (
          <div className="printtool-collage-pool__loading">
            <span className="printtool-collage-pool__spinner" />
            <span className="printtool-collage-pool__loading-text">
              Loading images... {loadingProgress.current} / {loadingProgress.total}
            </span>
            <div className="printtool-collage-pool__loading-bar">
              <div
                className="printtool-collage-pool__loading-fill"
                style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="printtool-collage-pool__dropzone-content">
            <span className="printtool-collage-pool__dropzone-icon">+</span>
            <span className="printtool-collage-pool__dropzone-text">
              Drop images here or click to add
            </span>
          </div>
        )}
      </div>

      {/* Thumbnail Grid */}
      {images.length > 0 && (
        <div className="printtool-collage-pool__thumbnails">
          {images.map(img => {
            const isUsed = layoutResult?.placements.some(p => p.imageId === img.id) ?? false
            return (
              <div
                key={img.id}
                className={`printtool-collage-pool__thumbnail ${
                  isUsed ? 'printtool-collage-pool__thumbnail--used' : ''
                }`}
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="printtool-collage-pool__thumbnail-img"
                />
                <button
                  type="button"
                  className="printtool-collage-pool__thumbnail-remove"
                  onClick={e => {
                    e.stopPropagation()
                    onRemoveImage(img.id)
                  }}
                  title="Remove image"
                >
                  ×
                </button>
                {isUsed && <span className="printtool-collage-pool__thumbnail-badge">✓</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = reject
    img.src = dataUrl
  })
}

export default CollageImagePool
