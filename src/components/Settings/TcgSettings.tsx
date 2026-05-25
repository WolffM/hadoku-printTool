/**
 * TcgSettings — settings panel for TCG proxy mode.
 *
 * Game-agnostic chrome (mode tabs, textarea, custom-image pool) with the
 * CardSource-specific bits (placeholder example, input help, cards/sheet
 * math) read from the active source. A Game dropdown switches sources.
 */

import type { TcgGame, TcgInputMode, TcgCustomImage } from '../../domain/types'
import { ImagePool } from '../shared/ImagePool'
import { SettingsPanel, SettingsSection, SettingsInfo } from '../shared/SettingsPanel'
import { SOURCES, SOURCE_ORDER, getSource } from '../../domain/processing/tcg'

interface TcgSettingsProps {
  tcgGame: TcgGame
  tcgInputMode: TcgInputMode
  tcgInput: string
  tcgCustomImages: TcgCustomImage[]
  onGameChange: (game: TcgGame) => void
  onInputModeChange: (mode: TcgInputMode) => void
  onInputChange: (input: string) => void
  onAddCustomImages: (images: TcgCustomImage[]) => void
  onRemoveCustomImage: (id: string) => void
  onClearCustomImages: () => void
}

export function TcgSettings({
  tcgGame,
  tcgInputMode,
  tcgInput,
  tcgCustomImages,
  onGameChange,
  onInputModeChange,
  onInputChange,
  onAddCustomImages,
  onRemoveCustomImage,
  onClearCustomImages
}: TcgSettingsProps) {
  const source = getSource(tcgGame)
  const cardsPerSheet = source.cardsPerRow * source.cardsPerCol

  const cardCount = tcgInput
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#')).length

  const description =
    tcgInputMode === 'list' ? source.inputHelp : 'Pre-rendered card images placed on sheets.'

  const sheetCountListMode = Math.max(1, Math.ceil(cardCount / cardsPerSheet))
  const sheetCountCustomMode = Math.max(1, Math.ceil(tcgCustomImages.length / cardsPerSheet))

  return (
    <SettingsPanel className="printtool-tcg-settings">
      <SettingsSection title="TCG Proxy Source" description={description}>
        <div className="printtool-tcg-settings__group">
          <label className="printtool-tcg-settings__label" htmlFor="tcg-game">
            Game
          </label>
          <select
            id="tcg-game"
            className="printtool-tcg-settings__select"
            value={tcgGame}
            onChange={e => onGameChange(e.target.value as TcgGame)}
          >
            {SOURCE_ORDER.map(id => (
              <option key={id} value={id}>
                {SOURCES[id].label}
              </option>
            ))}
          </select>
        </div>

        <div className="printtool-tcg-settings__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tcgInputMode === 'list'}
            className={`printtool-tcg-settings__tab ${
              tcgInputMode === 'list' ? 'printtool-tcg-settings__tab--active' : ''
            }`}
            onClick={() => onInputModeChange('list')}
          >
            Card List
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tcgInputMode === 'custom'}
            className={`printtool-tcg-settings__tab ${
              tcgInputMode === 'custom' ? 'printtool-tcg-settings__tab--active' : ''
            }`}
            onClick={() => onInputModeChange('custom')}
          >
            Custom Images
          </button>
        </div>

        {tcgInputMode === 'list' ? (
          <>
            <textarea
              className="printtool-tcg-settings__textarea"
              value={tcgInput}
              onChange={e => onInputChange(e.target.value)}
              placeholder={source.placeholderExample}
              rows={10}
              spellCheck={false}
            />
            <div className="printtool-tcg-settings__hint">
              {cardCount} card{cardCount === 1 ? '' : 's'} · {sheetCountListMode} sheet
              {sheetCountListMode === 1 ? '' : 's'}
            </div>
          </>
        ) : (
          <>
            <ImagePool<TcgCustomImage>
              title="Card Images"
              images={tcgCustomImages}
              onAdd={onAddCustomImages}
              onRemove={onRemoveCustomImage}
              onClear={onClearCustomImages}
            />
            {tcgCustomImages.length > 0 && (
              <div className="printtool-tcg-settings__hint">
                {sheetCountCustomMode} sheet{sheetCountCustomMode === 1 ? '' : 's'}
              </div>
            )}
          </>
        )}

        <SettingsInfo>
          <p>
            <strong>Output:</strong> 8.5" × 11" sheets at 300 DPI, {source.cardsPerRow}×
            {source.cardsPerCol} grid of {source.cardWidthInches}" × {source.cardHeightInches}"
            cards. Cards with back faces generate a mirrored back sheet for duplex printing.
          </p>
        </SettingsInfo>
      </SettingsSection>
    </SettingsPanel>
  )
}
