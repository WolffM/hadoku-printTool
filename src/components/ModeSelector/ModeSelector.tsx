/**
 * ModeSelector Component
 * Segmented button for selecting print mode
 */

import React from 'react'
import type { PrintMode } from '../../domain/types'

interface ModeSelectorProps {
  mode: PrintMode
  onModeChange: (mode: PrintMode) => void
}

const MODES: { id: PrintMode; label: string }[] = [
  { id: 'simple', label: 'Simple Tiling' },
  { id: 'duplex', label: 'Postcard Duplex' },
  { id: 'calibration', label: 'Calibration Sheet' }
]

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="printtool-mode-selector" role="tablist">
      {MODES.map(({ id, label }) => (
        <button
          key={id}
          role="tab"
          type="button"
          className={`printtool-mode-selector__button ${
            mode === id ? 'printtool-mode-selector__button--active' : ''
          }`}
          aria-selected={mode === id}
          onClick={() => onModeChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
