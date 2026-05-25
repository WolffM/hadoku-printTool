/**
 * MTG Proxies mode — Scryfall lookup + 3×3 card sheet compositor.
 */

import { logger } from '@wolffm/task-ui-components'
import type { ModeModule } from './types'
import { MtgSettings } from '../../components/Settings/MtgSettings'
import {
  parseMtgInput,
  fetchCard,
  createMtgSheets,
  createMtgSheetsFromImages,
  type FetchedCard
} from '../processing/mtg'
import { loadImage } from '../processing/canvasUtils'

export const mtgMode: ModeModule = {
  id: 'mtg',
  label: 'MTG Proxies',
  processingTitle: 'Building MTG Sheets...',

  canProcess: state => {
    if (state.mtgInputMode === 'list') return state.mtgInput.trim().length > 0
    return state.mtgCustomImages.length > 0
  },

  renderSettings: ({ state, actions }) => (
    <MtgSettings
      mtgInputMode={state.mtgInputMode}
      mtgInput={state.mtgInput}
      mtgCustomImages={state.mtgCustomImages}
      onInputModeChange={actions.setMtgInputMode}
      onInputChange={actions.setMtgInput}
      onAddCustomImages={actions.addMtgCustomImages}
      onRemoveCustomImage={actions.removeMtgCustomImage}
      onClearCustomImages={actions.clearMtgCustomImages}
    />
  ),

  process: async ({ state, reportProgress }) => {
    let sheets: Awaited<ReturnType<typeof createMtgSheets>>

    if (state.mtgInputMode === 'list') {
      const entries = parseMtgInput(state.mtgInput)
      if (entries.length === 0) {
        throw new Error('No valid card entries found')
      }

      reportProgress({
        step: 0,
        total: entries.length,
        message: `Fetching ${entries.length} cards from Scryfall...`
      })

      const fetched: FetchedCard[] = []
      const missing: string[] = []
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        reportProgress({
          step: i,
          total: entries.length,
          message: `Fetching: ${entry.raw}`
        })
        const card = await fetchCard(entry)
        if (card) fetched.push(card)
        else missing.push(entry.raw)
      }

      if (fetched.length === 0) {
        throw new Error(`No cards could be fetched. Failed: ${missing.join(', ')}`)
      }

      reportProgress({ step: 0, total: fetched.length, message: 'Building sheets...' })
      sheets = await createMtgSheets({
        cards: fetched,
        onProgress: (current, total) =>
          reportProgress({
            step: current,
            total,
            message: `Composing card ${current}/${total}`
          })
      })

      if (missing.length > 0) {
        logger.warn('[mtgMode] Some MTG cards failed to fetch', { missing })
      }
    } else {
      reportProgress({
        step: 0,
        total: state.mtgCustomImages.length,
        message: 'Loading images...'
      })

      const images = await Promise.all(state.mtgCustomImages.map(c => loadImage(c.dataUrl)))
      sheets = await createMtgSheetsFromImages(images, (current, total) =>
        reportProgress({
          step: current,
          total,
          message: `Composing card ${current}/${total}`
        })
      )
    }

    reportProgress(null)

    if (sheets.length === 0) {
      throw new Error('No sheets generated')
    }

    const first = sheets[0]
    return {
      frontCanvas: first.front,
      backCanvas: first.back,
      sheets,
      layoutInfo: null,
      filename: `mtg_proxies_${new Date().toISOString().slice(0, 10)}`
    }
  }
}
