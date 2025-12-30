/**
 * Hook for handling image file uploads with preview generation
 */

import { useState, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { logger } from '@wolffm/task-ui-components'
import type { ImageFile } from '../domain/types'
import { ACCEPTED_IMAGE_TYPES } from '../domain/constants'

interface UseImageUploadResult {
  image: ImageFile | null
  isLoading: boolean
  error: string | null
  handleFile: (file: File) => Promise<void>
  handleDrop: (e: DragEvent<Element>) => Promise<void>
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>
  clear: () => void
}

/**
 * Load an image file and extract metadata
 */
async function loadImageFile(file: File): Promise<ImageFile> {
  return new Promise((resolve, reject) => {
    // Validate file type
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

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = dataUrl
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Hook for managing image upload state
 */
export function useImageUpload(): UseImageUploadResult {
  const [image, setImage] = useState<ImageFile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      const imageFile = await loadImageFile(file)
      setImage(imageFile)
      logger.info('[useImageUpload] Image loaded', {
        name: imageFile.name,
        width: imageFile.width,
        height: imageFile.height
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load image'
      setError(message)
      logger.error('[useImageUpload] Error loading image', { error: message })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDrop = useCallback(
    async (e: DragEvent<Element>) => {
      e.preventDefault()
      e.stopPropagation()

      const file = e.dataTransfer.files[0]
      if (file) {
        await handleFile(file)
      }
    },
    [handleFile]
  )

  const handleInputChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        await handleFile(file)
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [handleFile]
  )

  const clear = useCallback(() => {
    setImage(null)
    setError(null)
    logger.info('[useImageUpload] Image cleared')
  }, [])

  return {
    image,
    isLoading,
    error,
    handleFile,
    handleDrop,
    handleInputChange,
    clear
  }
}
