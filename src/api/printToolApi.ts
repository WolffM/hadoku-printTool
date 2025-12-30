/**
 * Print Tool API
 * Backend API calls for ImageMagick processing and TIFF export.
 */

import { logger } from '@wolffm/task-ui-components'
import type {
  CalibrationRequest,
  CalibrationResponse,
  ExportRequest,
  ExportResponse,
  Variation
} from '../domain/types'

// API base URL - will be configured based on environment
const API_BASE_URL = '/api/printtool'

/**
 * Convert a canvas to base64 PNG data
 */
export function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png').split(',')[1]
}

/**
 * Convert a data URL to base64 string
 */
export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(',')[1]
}

/**
 * Download a base64 file
 */
export function downloadBase64File(base64: string, filename: string, mimeType: string): void {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Download a canvas as PNG
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob(blob => {
    if (!blob) {
      logger.error('[printToolApi] Failed to create blob from canvas')
      return
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 'image/png')
}

/**
 * Generate a calibration sheet using the backend ImageMagick service.
 *
 * @param imageBase64 - Source image as base64
 * @param paperSize - Paper size key (e.g., "Letter", "11x17")
 * @param grid - Grid dimensions [cols, rows]
 * @param dpi - Output DPI
 * @param variations - Array of variations with labels and ImageMagick args
 */
export async function generateCalibrationSheet(
  imageBase64: string,
  paperSize: string,
  grid: [number, number],
  dpi: number,
  variations: Variation[]
): Promise<CalibrationResponse> {
  logger.info('[printToolApi] Generating calibration sheet', {
    paperSize,
    grid,
    dpi,
    variationCount: variations.length
  })

  const request: CalibrationRequest = {
    image: imageBase64,
    paperSize,
    grid,
    dpi,
    variations
  }

  try {
    const response = await fetch(`${API_BASE_URL}/calibration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
    }

    const data = (await response.json()) as CalibrationResponse

    if (!data.success) {
      throw new Error(data.error || 'Unknown error generating calibration sheet')
    }

    logger.info('[printToolApi] Calibration sheet generated successfully')
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[printToolApi] Failed to generate calibration sheet', { error: message })
    return {
      success: false,
      error: message
    }
  }
}

/**
 * Export an image to TIFF format using the backend service.
 *
 * @param imageBase64 - Source image as base64 PNG
 * @param dpi - DPI to embed in TIFF metadata
 */
export async function exportToTiff(imageBase64: string, dpi: number): Promise<ExportResponse> {
  logger.info('[printToolApi] Exporting to TIFF', { dpi })

  const request: ExportRequest = {
    image: imageBase64,
    format: 'tiff',
    dpi
  }

  try {
    const response = await fetch(`${API_BASE_URL}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
    }

    const data = (await response.json()) as ExportResponse

    if (!data.success) {
      throw new Error(data.error || 'Unknown error exporting to TIFF')
    }

    logger.info('[printToolApi] TIFF export successful')
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[printToolApi] Failed to export to TIFF', { error: message })
    return {
      success: false,
      error: message
    }
  }
}

/**
 * Check if the backend API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET'
    })
    return response.ok
  } catch {
    return false
  }
}
