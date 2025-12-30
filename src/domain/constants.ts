/**
 * Print Tool Constants
 * Ported from Python printTool/src/core/constants.py
 */

// ============================================================================
// Tile Sizes (inches, portrait orientation: width x height)
// ============================================================================

export const TILE_SIZES = {
  '5x7': [5, 7] as const,
  '4x6': [4, 6] as const,
  '8x10': [8, 10] as const,
  '4x5': [4, 5] as const,
  '3.5x5': [3.5, 5] as const
} as const

// ============================================================================
// Paper Sizes (inches, portrait orientation: width x height)
// ============================================================================

export const PAPER_SIZES = {
  '11x17': [11, 17] as const,
  Letter: [8.5, 11] as const,
  A4: [8.27, 11.69] as const,
  A3: [11.69, 16.54] as const,
  Legal: [8.5, 14] as const
} as const

// ============================================================================
// Position Options (for single-tile testing)
// ============================================================================

export const POSITION_OPTIONS = [
  'All',
  'Top-Left',
  'Top-Right',
  'Bottom-Left',
  'Bottom-Right'
] as const

export const POSITION_COORDS: Record<string, [number, number]> = {
  'Top-Left': [0, 0], // [row, col]
  'Top-Right': [0, 1],
  'Bottom-Left': [1, 0],
  'Bottom-Right': [1, 1]
}

// ============================================================================
// Calibration Grid Options
// ============================================================================

export const CALIBRATION_GRIDS = {
  '2x4 (8 variations)': [2, 4] as const,
  '3x4 (12 variations)': [3, 4] as const,
  '4x4 (16 variations)': [4, 4] as const
} as const

// ============================================================================
// Calibration DPI Options
// ============================================================================

export const CALIBRATION_DPI = {
  '300 (Fast)': 300,
  '600 (Quality)': 600
} as const

// ============================================================================
// Variation Presets
// Each preset is an array of [label, ImageMagick args] tuples
// ============================================================================

export const VARIATION_PRESETS = {
  'Glossy Standard': [
    { label: '1. Baseline', args: [] },
    { label: '2. Sat+10', args: ['-modulate', '100,110,100'] },
    { label: '3. Sat+15', args: ['-modulate', '100,115,100'] },
    { label: '4. S-curve', args: ['-sigmoidal-contrast', '3,50%'] },
    {
      label: '5. S+Sat',
      args: ['-sigmoidal-contrast', '3,50%', '-modulate', '100,105,100']
    },
    {
      label: '6. Vibrance+15',
      args: [
        '-colorspace',
        'HCL',
        '-channel',
        'G',
        '-evaluate',
        'multiply',
        '1.15',
        '+channel',
        '-colorspace',
        'sRGB'
      ]
    },
    {
      label: '7. Contrast Pop',
      args: ['-sigmoidal-contrast', '4,50%', '-modulate', '100,105,100']
    },
    { label: '8. High Sat', args: ['-modulate', '100,120,100'] }
  ],
  'Fix Green/Dark': [
    { label: '1. Baseline', args: [] },
    { label: '2. G 1.15', args: ['-gamma', '1.15'] },
    {
      label: '3. Aggressive',
      args: [
        '-gamma',
        '1.25',
        '-channel',
        'G',
        '-evaluate',
        'multiply',
        '0.92',
        '+channel',
        '-channel',
        'B',
        '-evaluate',
        'multiply',
        '0.88',
        '+channel',
        '-channel',
        'R',
        '-evaluate',
        'multiply',
        '1.05',
        '+channel'
      ]
    },
    {
      label: '4. G1.15+Sat10',
      args: ['-gamma', '1.15', '-modulate', '100,110,100']
    },
    {
      label: '5. G1.15+Sat15',
      args: ['-gamma', '1.15', '-modulate', '100,115,100']
    },
    {
      label: '6. G1.15+W+S10',
      args: [
        '-gamma',
        '1.15',
        '-channel',
        'B',
        '-evaluate',
        'multiply',
        '0.93',
        '+channel',
        '-channel',
        'R',
        '-evaluate',
        'multiply',
        '1.04',
        '+channel',
        '-modulate',
        '100,110,100'
      ]
    },
    {
      label: '7. Aggr+Sat10',
      args: [
        '-gamma',
        '1.25',
        '-channel',
        'G',
        '-evaluate',
        'multiply',
        '0.92',
        '+channel',
        '-channel',
        'B',
        '-evaluate',
        'multiply',
        '0.88',
        '+channel',
        '-channel',
        'R',
        '-evaluate',
        'multiply',
        '1.05',
        '+channel',
        '-modulate',
        '100,110,100'
      ]
    },
    {
      label: '8. G1.20+Vib',
      args: [
        '-gamma',
        '1.20',
        '-colorspace',
        'HCL',
        '-channel',
        'G',
        '-evaluate',
        'multiply',
        '1.12',
        '+channel',
        '-colorspace',
        'sRGB'
      ]
    }
  ],
  'Matte M+5': [
    { label: '1. Baseline', args: [] },
    { label: '2. M+5', args: ['-channel', 'RB', '-evaluate', 'add', '5%', '+channel'] },
    {
      label: '3. M+5 Sat+10',
      args: ['-channel', 'RB', '-evaluate', 'add', '5%', '+channel', '-modulate', '100,110,100']
    },
    {
      label: '4. M+5 S-curve',
      args: ['-channel', 'RB', '-evaluate', 'add', '5%', '+channel', '-sigmoidal-contrast', '3,50%']
    },
    { label: '5. M+7', args: ['-channel', 'RB', '-evaluate', 'add', '7%', '+channel'] },
    {
      label: '6. M+5 G0.9',
      args: ['-channel', 'RB', '-evaluate', 'add', '5%', '+channel', '-gamma', '0.90']
    },
    {
      label: '7. M+5 Vib+15',
      args: [
        '-channel',
        'RB',
        '-evaluate',
        'add',
        '5%',
        '+channel',
        '-colorspace',
        'HCL',
        '-channel',
        'G',
        '-evaluate',
        'multiply',
        '1.15',
        '+channel',
        '-colorspace',
        'sRGB'
      ]
    },
    {
      label: '8. M+5 MaxRich',
      args: [
        '-channel',
        'RB',
        '-evaluate',
        'add',
        '5%',
        '+channel',
        '-sigmoidal-contrast',
        '4,40%',
        '-gamma',
        '0.88'
      ]
    }
  ],
  'Gamma Test': [
    { label: '1. Baseline', args: [] },
    { label: '2. Gamma 0.80', args: ['-gamma', '0.80'] },
    { label: '3. Gamma 0.85', args: ['-gamma', '0.85'] },
    { label: '4. Gamma 0.90', args: ['-gamma', '0.90'] },
    { label: '5. Gamma 0.95', args: ['-gamma', '0.95'] },
    { label: '6. Gamma 1.05', args: ['-gamma', '1.05'] },
    { label: '7. Gamma 1.10', args: ['-gamma', '1.10'] },
    { label: '8. Gamma 1.20', args: ['-gamma', '1.20'] }
  ],
  'Saturation Test': [
    { label: '1. Baseline', args: [] },
    { label: '2. Sat -10%', args: ['-modulate', '100,90,100'] },
    { label: '3. Sat +5%', args: ['-modulate', '100,105,100'] },
    { label: '4. Sat +10%', args: ['-modulate', '100,110,100'] },
    { label: '5. Sat +15%', args: ['-modulate', '100,115,100'] },
    { label: '6. Sat +20%', args: ['-modulate', '100,120,100'] },
    { label: '7. Sat +25%', args: ['-modulate', '100,125,100'] },
    { label: '8. Sat +30%', args: ['-modulate', '100,130,100'] }
  ]
} as const

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_DPI = 300
export const DEFAULT_PAPER_SIZE = '11x17' as const
export const DEFAULT_TILE_SIZE = '5x7' as const
export const DEFAULT_POSITION = 'All' as const
export const DEFAULT_CALIBRATION_GRID = '2x4 (8 variations)' as const
export const DEFAULT_CALIBRATION_DPI = 600
export const DEFAULT_CALIBRATION_PRESET = 'Glossy Standard' as const

// ============================================================================
// Processing Constants
// ============================================================================

/** Gap between tiles in inches (1/8 inch) */
export const TILE_GAP_INCHES = 0.125

/** Accepted image file types */
export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/tiff',
  'image/webp',
  'image/bmp'
]

/** Accepted file extensions for file input */
export const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg,.tif,.tiff,.webp,.bmp'
