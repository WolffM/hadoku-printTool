/**
 * Single-image file loader.
 *
 * Used by `<ImageUpload>` to decode a single source image into an `ImageFile`
 * (data URL + width/height/aspect). Multi-image flows use `<ImagePool>`.
 */

import type { ImageFile } from '../domain/types'
import { ACCEPTED_IMAGE_TYPES } from '../domain/constants'

export async function loadImageFile(file: File): Promise<ImageFile> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`)
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      const img = new Image()
      img.onload = () =>
        resolve({
          file,
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
          name: file.name
        })
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = dataUrl
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
