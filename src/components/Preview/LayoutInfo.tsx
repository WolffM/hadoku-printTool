/**
 * LayoutInfo Component
 * Displays calculated layout information
 */

import React from 'react'
import type { LayoutInfo as LayoutInfoType } from '../../domain/types'

interface LayoutInfoProps {
  layout: LayoutInfoType | null
}

export function LayoutInfo({ layout }: LayoutInfoProps) {
  if (!layout) {
    return (
      <div className="printtool-layout-info printtool-layout-info--error">
        <span>Cannot fit tiles on selected paper</span>
      </div>
    )
  }

  return (
    <div className="printtool-layout-info">
      <div className="printtool-layout-info__main">
        <span className="printtool-layout-info__count">{layout.count}</span>
        <span className="printtool-layout-info__label">
          {layout.count === 1 ? 'tile' : 'tiles'}
        </span>
      </div>
      <div className="printtool-layout-info__details">
        <span>
          {layout.cols} × {layout.rows} grid
        </span>
        <span>
          {layout.tileW}" × {layout.tileH}" tiles
        </span>
        <span>
          {layout.paperW}" × {layout.paperH}" paper (
          {layout.paperLandscape ? 'landscape' : 'portrait'})
        </span>
      </div>
    </div>
  )
}
