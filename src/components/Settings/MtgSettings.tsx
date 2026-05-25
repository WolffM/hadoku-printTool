/**
 * MtgSettings Component
 * Input panel for MTG proxy mode — either a list of cards (Scryfall lookup)
 * or a folder of pre-rendered card PNGs (custom-assets mode).
 */

import type { MtgInputMode, MtgCustomImage } from '../../domain/types'
import { ImagePool } from '../shared/ImagePool'
import { SettingsPanel, SettingsSection, SettingsInfo } from '../shared/SettingsPanel'

interface MtgSettingsProps {
  mtgInputMode: MtgInputMode
  mtgInput: string
  mtgCustomImages: MtgCustomImage[]
  onInputModeChange: (mode: MtgInputMode) => void
  onInputChange: (input: string) => void
  onAddCustomImages: (images: MtgCustomImage[]) => void
  onRemoveCustomImage: (id: string) => void
  onClearCustomImages: () => void
}

export function MtgSettings({
  mtgInputMode,
  mtgInput,
  mtgCustomImages,
  onInputModeChange,
  onInputChange,
  onAddCustomImages,
  onRemoveCustomImage,
  onClearCustomImages
}: MtgSettingsProps) {
  const cardCount = mtgInput
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#')).length

  const description =
    mtgInputMode === 'list' ? (
      <>
        One card per line. Accepts a Scryfall URL or <code>name, set, collector#</code> (set /
        collector# optional).
      </>
    ) : (
      'Pre-rendered card images placed on 3×3 sheets at 300 DPI.'
    )

  return (
    <SettingsPanel className="printtool-mtg-settings">
      <SettingsSection title="MTG Proxy Source" description={description}>
        <div className="printtool-mtg-settings__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mtgInputMode === 'list'}
            className={`printtool-mtg-settings__tab ${
              mtgInputMode === 'list' ? 'printtool-mtg-settings__tab--active' : ''
            }`}
            onClick={() => onInputModeChange('list')}
          >
            Card List (Scryfall)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mtgInputMode === 'custom'}
            className={`printtool-mtg-settings__tab ${
              mtgInputMode === 'custom' ? 'printtool-mtg-settings__tab--active' : ''
            }`}
            onClick={() => onInputModeChange('custom')}
          >
            Custom Images
          </button>
        </div>

        {mtgInputMode === 'list' ? (
          <>
            <textarea
              className="printtool-mtg-settings__textarea"
              value={mtgInput}
              onChange={e => onInputChange(e.target.value)}
              placeholder={`Lightning Bolt, M10, 150
Sol Ring, c21, 263
https://scryfall.com/card/neo/238/...`}
              rows={10}
              spellCheck={false}
            />
            <div className="printtool-mtg-settings__hint">
              {cardCount} card{cardCount === 1 ? '' : 's'} · {Math.ceil(cardCount / 9)} sheet
              {Math.ceil(cardCount / 9) === 1 ? '' : 's'}
            </div>
          </>
        ) : (
          <>
            <ImagePool<MtgCustomImage>
              title="Card Images"
              images={mtgCustomImages}
              onAdd={onAddCustomImages}
              onRemove={onRemoveCustomImage}
              onClear={onClearCustomImages}
            />
            {mtgCustomImages.length > 0 && (
              <div className="printtool-mtg-settings__hint">
                {Math.ceil(mtgCustomImages.length / 9)} sheet
                {Math.ceil(mtgCustomImages.length / 9) === 1 ? '' : 's'}
              </div>
            )}
          </>
        )}

        <SettingsInfo>
          <p>
            <strong>Output:</strong> 8.5" × 11" sheets at 300 DPI, 3×3 grid of 2.5" × 3.5" cards.
            Cards with back faces (transform / MDFC) generate a mirrored back sheet.
          </p>
        </SettingsInfo>
      </SettingsSection>
    </SettingsPanel>
  )
}
