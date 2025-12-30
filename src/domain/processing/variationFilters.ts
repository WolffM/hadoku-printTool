/**
 * Variation Filters
 * Maps ImageMagick args to CSS filter approximations for preview.
 *
 * NOTE: These are approximations for preview only.
 * Actual processing is done server-side with ImageMagick for accurate results.
 */

import type React from 'react'

/**
 * Parse ImageMagick args and generate a CSS filter string approximation.
 *
 * Supported mappings:
 * - `-gamma X` → brightness(X) - rough approximation
 * - `-modulate B,S,H` → saturate(S%)
 * - `-sigmoidal-contrast X` → contrast(1 + X*0.1)
 *
 * Many ImageMagick operations have no direct CSS equivalent,
 * so this is a best-effort preview approximation.
 */
export function imageMagickArgsToCssFilter(args: readonly string[]): string {
  const filters: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    // -gamma X
    if (arg === '-gamma' && i + 1 < args.length) {
      const gammaValue = parseFloat(args[i + 1])
      if (!isNaN(gammaValue)) {
        // CSS brightness is a rough approximation of gamma
        // gamma < 1 darkens, gamma > 1 brightens
        filters.push(`brightness(${gammaValue})`)
      }
      i++ // Skip the value
    }

    // -modulate brightness,saturation,hue
    if (arg === '-modulate' && i + 1 < args.length) {
      const parts = args[i + 1].split(',').map(p => parseFloat(p))
      if (parts.length >= 2 && !isNaN(parts[1])) {
        // Saturation: 100 is baseline, 110 is +10%
        filters.push(`saturate(${parts[1]}%)`)
      }
      if (parts.length >= 1 && !isNaN(parts[0]) && parts[0] !== 100) {
        // Brightness adjustment
        filters.push(`brightness(${parts[0] / 100})`)
      }
      i++
    }

    // -sigmoidal-contrast X,midpoint%
    if (arg === '-sigmoidal-contrast' && i + 1 < args.length) {
      const parts = args[i + 1].split(',')
      const contrastValue = parseFloat(parts[0])
      if (!isNaN(contrastValue)) {
        // Approximate with CSS contrast
        // sigmoidal-contrast 3 roughly maps to contrast(1.3)
        filters.push(`contrast(${1 + contrastValue * 0.1})`)
      }
      i++
    }
  }

  return filters.length > 0 ? filters.join(' ') : 'none'
}

/**
 * Generate a preview style object for a variation.
 */
export function getVariationPreviewStyle(args: readonly string[]): React.CSSProperties {
  const filter = imageMagickArgsToCssFilter(args)
  return filter !== 'none' ? { filter } : {}
}
