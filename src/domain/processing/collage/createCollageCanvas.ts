/**
 * Collage Canvas Renderer
 *
 * Creates a canvas with all images placed according to the layout algorithm
 */

import Pica from 'pica'
import { PAPER_SIZES } from '../../constants'
import type { CollagePoolImage, CollageLayoutResult, CropAnchor } from '../../types'
import type { CreateCollageParams, CreateCollageResult, PlacedImage } from './types'
import { generateSeed } from './randomization'
import { optimizeScaleFactor, imagesToDimensions } from './optimization'

export interface CollageProgress {
  step: number
  total: number
  message: string
}

const pica = new Pica()

/**
 * Create a collage canvas from a pool of images
 */
export async function createCollageCanvas(
  params: CreateCollageParams,
  onProgress?: (progress: CollageProgress) => void
): Promise<CreateCollageResult> {
  const { images, settings, seed: inputSeed } = params
  const seed = inputSeed ?? generateSeed()

  // Helper to report progress
  const reportProgress = (step: number, total: number, message: string) => {
    onProgress?.({ step, total, message })
  }

  // Get paper dimensions
  const paperSize = PAPER_SIZES[settings.paperSize]
  const pageWidthInches = paperSize[0]
  const pageHeightInches = paperSize[1]

  // Convert images to dimensions in inches based on their native resolution
  // Assume 300 DPI as base resolution for uploaded images
  const imageDimensions = imagesToDimensions(
    images.map(img => ({
      id: img.id,
      width: img.width,
      height: img.height
    })),
    300 // Base DPI for source images
  )

  reportProgress(0, images.length + 1, 'Calculating optimal layout...')

  // Run optimization to find best scale
  const optimized = optimizeScaleFactor(
    imageDimensions,
    pageWidthInches,
    pageHeightInches,
    settings.algorithm,
    settings.gapInches,
    settings.minImageSizeInches,
    seed,
    settings.maxDownscalePercent,
    settings.normalizeImageSizes
  )

  const { output, bestScale } = optimized

  // Create the layout result
  const layout: CollageLayoutResult = {
    placements: output.placements,
    coverage: output.coverage,
    unusedImageIds: output.unusedImageIds,
    scaleFactor: bestScale,
    seed
  }

  // Mark images as selected/not selected
  const placedIds = new Set(layout.placements.map(p => p.imageId))
  for (const img of images) {
    img.selected = placedIds.has(img.id)
  }

  // Create canvas at target DPI
  const canvasWidth = Math.round(pageWidthInches * settings.dpi)
  const canvasHeight = Math.round(pageHeightInches * settings.dpi)

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Fill with white background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Create a map for quick image lookup
  const imageMap = new Map<string, CollagePoolImage>()
  for (const img of images) {
    imageMap.set(img.id, img)
  }

  // Render each placed image
  const totalPlacements = layout.placements.length
  for (let i = 0; i < layout.placements.length; i++) {
    const placement = layout.placements[i]
    const sourceImage = imageMap.get(placement.imageId)
    if (!sourceImage) continue

    reportProgress(i + 1, totalPlacements + 1, `Rendering image ${i + 1} of ${totalPlacements}...`)

    // Yield to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 0))

    await renderPlacedImage(ctx, sourceImage, placement, settings.dpi, settings)
  }

  reportProgress(totalPlacements + 1, totalPlacements + 1, 'Complete!')

  return { canvas, layout }
}

async function renderPlacedImage(
  ctx: CanvasRenderingContext2D,
  source: CollagePoolImage,
  placement: PlacedImage,
  dpi: number,
  settings: { allowCropping: boolean; maxCropPercent: number; cropAnchor: CropAnchor }
): Promise<void> {
  // Convert placement rect from inches to pixels
  const destX = Math.round(placement.rect.x * dpi)
  const destY = Math.round(placement.rect.y * dpi)
  const destWidth = Math.round(placement.rect.width * dpi)
  const destHeight = Math.round(placement.rect.height * dpi)

  // Load source image
  const img = await loadImage(source.dataUrl)

  // Calculate source dimensions
  let srcX = 0
  let srcY = 0
  let srcWidth = img.width
  let srcHeight = img.height

  // Apply cropping if enabled
  if (settings.allowCropping && placement.cropBox) {
    srcX = placement.cropBox.sx
    srcY = placement.cropBox.sy
    srcWidth = placement.cropBox.sw
    srcHeight = placement.cropBox.sh
  } else if (settings.allowCropping) {
    // Calculate crop to fit target aspect ratio
    const targetAspect = destWidth / destHeight
    const sourceAspect = srcWidth / srcHeight

    if (Math.abs(targetAspect - sourceAspect) > 0.01) {
      const crop = calculateCrop(
        srcWidth,
        srcHeight,
        targetAspect,
        settings.maxCropPercent / 100,
        settings.cropAnchor
      )
      srcX = crop.x
      srcY = crop.y
      srcWidth = crop.width
      srcHeight = crop.height
    }
  }

  // Create a temp canvas for the source region
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = srcWidth
  tempCanvas.height = srcHeight
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return

  // Handle rotation if needed
  if (placement.rotated) {
    tempCtx.translate(srcHeight, 0)
    tempCtx.rotate(Math.PI / 2)
    tempCtx.drawImage(img, -srcX, -srcY)
  } else {
    tempCtx.drawImage(img, -srcX, -srcY)
  }

  // Use Pica for high-quality resize
  const destCanvas = document.createElement('canvas')
  destCanvas.width = destWidth
  destCanvas.height = destHeight

  await pica.resize(tempCanvas, destCanvas, {
    quality: 3,
    alpha: true
  })

  // Draw to main canvas
  ctx.drawImage(destCanvas, destX, destY)
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

interface CropResult {
  x: number
  y: number
  width: number
  height: number
}

function calculateCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetAspect: number,
  maxCropRatio: number,
  anchor: CropAnchor
): CropResult {
  const sourceAspect = sourceWidth / sourceHeight

  let cropWidth = sourceWidth
  let cropHeight = sourceHeight

  if (targetAspect > sourceAspect) {
    // Target is wider - crop height
    const idealHeight = sourceWidth / targetAspect
    const maxCrop = sourceHeight * maxCropRatio
    cropHeight = Math.max(idealHeight, sourceHeight - maxCrop)
  } else {
    // Target is taller - crop width
    const idealWidth = sourceHeight * targetAspect
    const maxCrop = sourceWidth * maxCropRatio
    cropWidth = Math.max(idealWidth, sourceWidth - maxCrop)
  }

  // Calculate offset based on anchor
  let x = 0
  let y = 0
  const xRemaining = sourceWidth - cropWidth
  const yRemaining = sourceHeight - cropHeight

  switch (anchor) {
    case 'center':
      x = xRemaining / 2
      y = yRemaining / 2
      break
    case 'top':
      x = xRemaining / 2
      y = 0
      break
    case 'bottom':
      x = xRemaining / 2
      y = yRemaining
      break
    case 'left':
      x = 0
      y = yRemaining / 2
      break
    case 'right':
      x = xRemaining
      y = yRemaining / 2
      break
    case 'top-left':
      x = 0
      y = 0
      break
    case 'top-right':
      x = xRemaining
      y = 0
      break
    case 'bottom-left':
      x = 0
      y = yRemaining
      break
    case 'bottom-right':
      x = xRemaining
      y = yRemaining
      break
  }

  return { x, y, width: cropWidth, height: cropHeight }
}
