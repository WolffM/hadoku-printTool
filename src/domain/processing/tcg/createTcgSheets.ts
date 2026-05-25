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
import { imageToCanvas, resizeCanvas, createBlankSheet, calculateGridOffsets } from '../canvasUtils'
import type { CardSource, FetchedCard } from './types'

export interface TcgSheet {
  front: HTMLCanvasElement
  back?: HTMLCanvasElement
}

export interface CreateTcgSheetsOptions {
  source: CardSource
  cards: FetchedCard[]
  onProgress?: (current: number, total: number) => void
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
  onProgress
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

      const frontTile = await resizeCanvas(
        imageToCanvas(card.front),
        layout.cardWidthPx,
        layout.cardHeightPx
      )
      frontCtx.drawImage(frontTile, x, y)

      if (card.back) {
        if (!back) {
          back = createBlankSheet(layout.pageWidthPx, layout.pageHeightPx, 'white')
          backCtx = back.getContext('2d')
        }
        const backTile = await resizeCanvas(
          imageToCanvas(card.back),
          layout.cardWidthPx,
          layout.cardHeightPx
        )
        // Mirror column so duplex printing (flip-on-long-edge) aligns front/back.
        const mirroredCol = layout.cardsPerRow - 1 - col
        const backX = layout.xOffset + mirroredCol * layout.cardWidthPx
        backCtx!.drawImage(backTile, backX, y)
      }

      processed++
      onProgress?.(processed, cards.length)
    }

    sheets.push(back ? { front, back } : { front })
  }

  return sheets
}

/**
 * Custom-assets path: composite pre-rendered images (one per card) without
 * any per-game fetch. Uses the source only for dimensions.
 */
export async function createTcgSheetsFromImages(
  source: CardSource,
  images: HTMLImageElement[],
  onProgress?: (current: number, total: number) => void
): Promise<TcgSheet[]> {
  const cards: FetchedCard[] = images.map(front => ({ front }))
  return createTcgSheets({ source, cards, onProgress })
}
