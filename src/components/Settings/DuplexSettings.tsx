/**
 * DuplexSettings Component
 * Additional settings panel for Duplex (double-sided) printing mode
 */

import React from 'react'
import type { ImageFile } from '../../domain/types'
import { ImageUpload } from '../ImageUpload/ImageUpload'

interface DuplexSettingsProps {
  backImage: ImageFile | null
  onBackImageChange: (image: ImageFile | null) => void
  frontImageOrientation?: 'portrait' | 'landscape'
}

export function DuplexSettings({
  backImage,
  onBackImageChange,
  frontImageOrientation
}: DuplexSettingsProps) {
  // Check if orientations match (for warning display)
  const backImageOrientation = backImage
    ? backImage.width < backImage.height
      ? 'portrait'
      : 'landscape'
    : null

  const orientationMismatch =
    frontImageOrientation && backImageOrientation && frontImageOrientation !== backImageOrientation

  return (
    <div className="printtool-duplex-settings">
      <div className="printtool-duplex-settings__section">
        <h3 className="printtool-duplex-settings__title">Back Image</h3>
        <p className="printtool-duplex-settings__description">
          Upload the image for the back side of the postcards
        </p>

        <ImageUpload
          image={backImage}
          onImageSelect={onBackImageChange}
          label="Drop back image here"
          compact
        />

        {orientationMismatch && (
          <div className="printtool-duplex-settings__warning">
            <span className="printtool-duplex-settings__warning-icon">⟳</span>
            <span>
              Back image will be auto-rotated to match front image orientation (
              {frontImageOrientation})
            </span>
          </div>
        )}

        <div className="printtool-duplex-settings__info">
          <p>
            <strong>Note:</strong> The back sheet will be automatically mirrored horizontally so
            that cards align correctly when printed double-sided (flip on long edge).
          </p>
        </div>
      </div>
    </div>
  )
}
