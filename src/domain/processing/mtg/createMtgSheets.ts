/**
 * MTG Proxy Sheet Compositor
 * Ported from Python mtgProxies/main.py:create_card_sheet_from_file / _from_custom
 *
 * Produces print-ready 8.5" × 11" sheets at 300 DPI with a 3×3 grid of
 * 2.5" × 3.5" cards. When any cards have back faces (transform / MDFC / etc.),
 * a matching back sheet is generated with columns mirrored left-to-right so
 * that duplex printing aligns front and back.
 */

import {
  MTG_CARDS_PER_ROW,
  MTG_CARDS_PER_COL,
  MTG_CARD_WIDTH_PX,
  MTG_CARD_HEIGHT_PX,
  MTG_PAGE_WIDTH_PX,
  MTG_PAGE_HEIGHT_PX
} from '../../constants'
import { imageToCanvas, resizeCanvas, createBlankSheet, calculateGridOffsets } from '../canvasUtils'
import type { FetchedCard } from './scryfall'

const CARDS_PER_SHEET = MTG_CARDS_PER_ROW * MTG_CARDS_PER_COL

export interface MtgSheet {
  front: HTMLCanvasElement
  back?: HTMLCanvasElement
}

export interface CreateMtgSheetsOptions {
  cards: FetchedCard[]
  onProgress?: (current: number, total: number) => void
}

async function resizeToCardSize(source: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  return resizeCanvas(source, MTG_CARD_WIDTH_PX, MTG_CARD_HEIGHT_PX)
}

export async function createMtgSheets({
  cards,
  onProgress
}: CreateMtgSheetsOptions): Promise<MtgSheet[]> {
  if (cards.length === 0) return []

  const { xOffset, yOffset } = calculateGridOffsets(
    MTG_PAGE_WIDTH_PX,
    MTG_PAGE_HEIGHT_PX,
    MTG_CARD_WIDTH_PX,
    MTG_CARD_HEIGHT_PX,
    MTG_CARDS_PER_COL,
    MTG_CARDS_PER_ROW,
    0
  )

  const sheets: MtgSheet[] = []
  let processed = 0

  for (let pageStart = 0; pageStart < cards.length; pageStart += CARDS_PER_SHEET) {
    const pageCards = cards.slice(pageStart, pageStart + CARDS_PER_SHEET)
    const front = createBlankSheet(MTG_PAGE_WIDTH_PX, MTG_PAGE_HEIGHT_PX, 'white')
    const frontCtx = front.getContext('2d')!

    let back: HTMLCanvasElement | null = null
    let backCtx: CanvasRenderingContext2D | null = null

    for (let idx = 0; idx < pageCards.length; idx++) {
      const card = pageCards[idx]
      const col = idx % MTG_CARDS_PER_ROW
      const row = Math.floor(idx / MTG_CARDS_PER_ROW)
      const x = xOffset + col * MTG_CARD_WIDTH_PX
      const y = yOffset + row * MTG_CARD_HEIGHT_PX

      const frontTile = await resizeToCardSize(imageToCanvas(card.front))
      frontCtx.drawImage(frontTile, x, y)

      if (card.back) {
        if (!back) {
          back = createBlankSheet(MTG_PAGE_WIDTH_PX, MTG_PAGE_HEIGHT_PX, 'white')
          backCtx = back.getContext('2d')
        }
        const backTile = await resizeToCardSize(imageToCanvas(card.back))
        const mirroredCol = MTG_CARDS_PER_ROW - 1 - col
        const backX = xOffset + mirroredCol * MTG_CARD_WIDTH_PX
        backCtx!.drawImage(backTile, backX, y)
      }

      processed++
      onProgress?.(processed, cards.length)
    }

    sheets.push(back ? { front, back } : { front })
  }

  return sheets
}

export async function createMtgSheetsFromImages(
  images: HTMLImageElement[],
  onProgress?: (current: number, total: number) => void
): Promise<MtgSheet[]> {
  const cards: FetchedCard[] = images.map(front => ({ front }))
  return createMtgSheets({ cards, onProgress })
}
