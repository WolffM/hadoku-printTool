# @wolffm/hadoku-printtool

Image manipulation tool for tiling, collaging, and preparing images for print-ready output.

## Overview

Print Tool is a React-based child app that provides image manipulation capabilities for preparing print-ready outputs. Integrates with the hadoku parent site for theming and deployment.

## Modes

- **Simple Tiling** - Tile a single image across a page (e.g., wallet photos, stickers)
- **Duplex Printing** - Create front/back sheets for double-sided postcards
- **Calibration** - Generate color/density calibration sheets via backend ImageMagick processing
- **Collage** - Arrange multiple images on a page using various layout algorithms:
  - FFD-Row: Row-based bin packing, good for similar-sized images
  - Masonry: Pinterest-style columns, good for portrait-heavy sets
  - Guillotine: Space-efficient bin packing with guillotine cuts
  - Spiral: Fill from edges inward in a spiral pattern
  - Treemap: Recursive space partitioning for balanced layouts

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Lint and format
pnpm lint:fix
pnpm format
```

### Logging

**Important**: Use the logger from `@wolffm/task-ui-components` instead of `console.log`:

```typescript
import { logger } from '@wolffm/task-ui-components'

logger.info('Message', { key: 'value' })
logger.error('Error occurred', error)
```

Logs are only visible to admins in dev mode.

## Integration

This app is a child component of the [hadoku_site](https://github.com/WolffM/hadoku_site) parent application.

### Props

```typescript
interface PrintToolProps {
  theme?: string // 'light', 'dark', 'coffee-dark', etc.
}
```

### Mounting

```typescript
import { mount, unmount } from '@wolffm/hadoku-printtool'

// Mount the app
mount(document.getElementById('app-root'), {
  theme: 'ocean-dark'
})

// Unmount when done
unmount(document.getElementById('app-root'))
```

## Deployment

Pushes to `main` automatically:

1. Build and publish to GitHub Packages
2. Notify parent site to update
3. Parent pulls new version and redeploys

### Versioning

Version bumps are handled automatically through two mechanisms:

1. **Pre-commit hook** (primary): The `.husky/pre-commit` hook automatically bumps the version for every commit
2. **Workflow fallback**: The publish workflow checks if the current version already exists in the registry and bumps it if needed

This dual approach ensures versions are always incremented, even if commits bypass the pre-commit hook (e.g., web UI edits, `--no-verify` commits).

Version bumping follows this pattern:
- Patch version increments on each commit (1.0.5 → 1.0.6)
- At patch 20, rolls over to next minor (1.0.20 → 1.1.0)
