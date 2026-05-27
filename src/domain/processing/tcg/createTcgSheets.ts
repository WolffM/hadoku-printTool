/**
 * TCG Proxy Sheet Compositor — game-agnostic.
 *
 * Produces print-ready 8.5" × 11" sheets at 300 DPI with a grid of cards
 * whose dimensions come from the CardSource. Cards with a back face emit a
 * column-mirrored back sheet for duplex printing (flip-on-long-edge model).
 *
 * Previously named `createMtgSheets` with MTG dimensions hard-coded; now
 * accepts any CardSource (MTG via Scryfall, Riftbound via piltoverarchive,
 * any future TCG).
 */

import { TCG_DPI, TCG_PAGE_WIDTH_INCHES, TCG_PAGE_HEIGHT_INCHES } from '../../constants'
import { resizeCanvas, createBlankSheet, calculateGridOffsets } from '../canvasUtils'
import type { CardSource, FetchedCard } from './types'

export interface TcgSheet {
  front: HTMLCanvasElement
  back?: HTMLCanvasElement
}

export interface CreateTcgSheetsOptions {
  source: CardSource
  cards: FetchedCard[]
  onProgress?: (current: number, total: number) => void
  /** Draw printer's crop marks at every card-edge intersection. Default false. */
  cutlines?: boolean
}

interface SheetLayout {
  pageWidthPx: number
  pageHeightPx: number
  cardWidthPx: number
  cardHeightPx: number
  xOffset: number
  yOffset: number
  cardsPerRow: number
  cardsPerSheet: number
}

function computeLayout(source: CardSource): SheetLayout {
  const pageWidthPx = Math.round(TCG_PAGE_WIDTH_INCHES * TCG_DPI)
  const pageHeightPx = Math.round(TCG_PAGE_HEIGHT_INCHES * TCG_DPI)
  const cardWidthPx = Math.round(source.cardWidthInches * TCG_DPI)
  const cardHeightPx = Math.round(source.cardHeightInches * TCG_DPI)
  const { xOffset, yOffset } = calculateGridOffsets(
    pageWidthPx,
    pageHeightPx,
    cardWidthPx,
    cardHeightPx,
    source.cardsPerCol,
    source.cardsPerRow,
    0
  )
  return {
    pageWidthPx,
    pageHeightPx,
    cardWidthPx,
    cardHeightPx,
    xOffset,
    yOffset,
    cardsPerRow: source.cardsPerRow,
    cardsPerSheet: source.cardsPerRow * source.cardsPerCol
  }
}

export async function createTcgSheets({
  source,
  cards,
  onProgress,
  cutlines = false
}: CreateTcgSheetsOptions): Promise<TcgSheet[]> {
  if (cards.length === 0) return []

  const layout = computeLayout(source)
  const sheets: TcgSheet[] = []
  let processed = 0

  for (let pageStart = 0; pageStart < cards.length; pageStart += layout.cardsPerSheet) {
    const pageCards = cards.slice(pageStart, pageStart + layout.cardsPerSheet)
    const front = createBlankSheet(layout.pageWidthPx, layout.pageHeightPx, 'white')
    const frontCtx = front.getContext('2d')!

    // Lazily allocate the back sheet — only created if any card on this page
    // has a back face. Matches the parity check used for the duplex tile mode.
    let back: HTMLCanvasElement | null = null
    let backCtx: CanvasRenderingContext2D | null = null

    for (let idx = 0; idx < pageCards.length; idx++) {
      const card = pageCards[idx]
      const col = idx % layout.cardsPerRow
      const row = Math.floor(idx / layout.cardsPerRow)
      const x = layout.xOffset + col * layout.cardWidthPx
      const y = layout.yOffset + row * layout.cardHeightPx

      const frontTile = await renderCardToSlot(card.front, layout.cardWidthPx, layout.cardHeightPx)
      frontCtx.drawImage(frontTile, x, y)

      if (card.back) {
        if (!back) {
          back = createBlankSheet(layout.pageWidthPx, layout.pageHeightPx, 'white')
          backCtx = back.getContext('2d')
        }
        const backTile = await renderCardToSlot(card.back, layout.cardWidthPx, layout.cardHeightPx)
        // Mirror column so duplex printing (flip-on-long-edge) aligns front/back.
        const mirroredCol = layout.cardsPerRow - 1 - col
        const backX = layout.xOffset + mirroredCol * layout.cardWidthPx
        backCtx!.drawImage(backTile, backX, y)
      }

      processed++
      onProgress?.(processed, cards.length)
    }

    if (cutlines) {
      drawCutlines(frontCtx, layout)
      if (back && backCtx) drawCutlines(backCtx, layout)
    }

    sheets.push(back ? { front, back } : { front })
  }

  return sheets
}

/**
 * Draw printer's crop marks (tick marks) at every card-edge intersection.
 * Marks extend from the page edge inward to the card edge, sitting in the
 * sheet's outer margin so they never overlap card art.
 */
function drawCutlines(ctx: CanvasRenderingContext2D, layout: SheetLayout) {
  // 1pt at 300dpi ≈ 0.5px — keep it crisp but visible at print resolution.
  const lineWidth = Math.max(1, Math.round(layout.cardWidthPx * 0.002))
  // Mark length: ~3mm; long enough to align a ruler, short enough to fit the margin.
  const markLengthPx = Math.min(
    Math.round(0.12 * (layout.cardWidthPx / 2.5)), // 0.12" if slot is 2.5"
    layout.xOffset - 4,
    layout.yOffset - 4
  )
  if (markLengthPx < 4) return // No margin to draw into.

  // cardsPerCol isn't on SheetLayout (only cardsPerRow + cardsPerSheet), so derive it.
  const cardsPerCol = layout.cardsPerSheet / layout.cardsPerRow
  const gridRightX = layout.xOffset + layout.cardsPerRow * layout.cardWidthPx
  const gridBottomY = layout.yOffset + cardsPerCol * layout.cardHeightPx

  ctx.save()
  ctx.strokeStyle = 'black'
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'butt'

  // Vertical ticks at column boundaries (drawn in top + bottom margin).
  for (let c = 0; c <= layout.cardsPerRow; c++) {
    const x = layout.xOffset + c * layout.cardWidthPx
    ctx.beginPath()
    ctx.moveTo(x, layout.yOffset - markLengthPx)
    ctx.lineTo(x, layout.yOffset)
    ctx.moveTo(x, gridBottomY)
    ctx.lineTo(x, gridBottomY + markLengthPx)
    ctx.stroke()
  }

  // Horizontal ticks at row boundaries (drawn in left + right margin).
  for (let r = 0; r <= cardsPerCol; r++) {
    const y = layout.yOffset + r * layout.cardHeightPx
    ctx.beginPath()
    ctx.moveTo(layout.xOffset - markLengthPx, y)
    ctx.lineTo(layout.xOffset, y)
    ctx.moveTo(gridRightX, y)
    ctx.lineTo(gridRightX + markLengthPx, y)
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Resize an image into a card slot without distorting its aspect ratio.
 *
 * Pica's `resize(src, target)` stretches to the target dimensions — fine
 * when the source already matches the slot aspect, but it skews the
 * cardback (1490×2080 → 0.7163) when squeezed into a poker-aspect slot
 * (750×1050 → 0.7143). Here we crop a centered region of the source to the
 * slot's aspect first, then pica only scales (no stretch).
 */
async function renderCardToSlot(
  img: HTMLImageElement,
  slotWidth: number,
  slotHeight: number
): Promise<HTMLCanvasElement> {
  const srcW = img.naturalWidth
  const srcH = img.naturalHeight
  const slotAspect = slotWidth / slotHeight
  const srcAspect = srcW / srcH

  let cropW = srcW
  let cropH = srcH
  let cropX = 0
  let cropY = 0
  if (srcAspect > slotAspect) {
    // Source is wider than slot → crop sides.
    cropW = srcH * slotAspect
    cropX = (srcW - cropW) / 2
  } else if (srcAspect < slotAspect) {
    // Source is taller than slot → crop top/bottom.
    cropH = srcW / slotAspect
    cropY = (srcH - cropH) / 2
  }

  const cropped = document.createElement('canvas')
  cropped.width = Math.max(1, Math.round(cropW))
  cropped.height = Math.max(1, Math.round(cropH))
  const cropCtx = cropped.getContext('2d')!
  cropCtx.fillStyle = 'white'
  cropCtx.fillRect(0, 0, cropped.width, cropped.height)
  cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropped.width, cropped.height)

  return resizeCanvas(cropped, slotWidth, slotHeight)
}

/**
 * Custom-assets path: composite pre-rendered images (one per card) without
 * any per-game fetch. Uses the source only for dimensions.
 */
export async function createTcgSheetsFromImages(
  source: CardSource,
  images: HTMLImageElement[],
  onProgress?: (current: number, total: number) => void,
  cutlines = false
): Promise<TcgSheet[]> {
  const cards: FetchedCard[] = images.map(front => ({ front }))
  return createTcgSheets({ source, cards, onProgress, cutlines })
}
