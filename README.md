# @wolffm/hadoku-printtool

Image manipulation tool for cropping, resizing, and collating images for print-ready output.

## Overview

Print Tool is a React-based child app that provides image manipulation capabilities for preparing print-ready outputs. Features include simple tiling, postcard duplex printing, and calibration sheet generation. Integrates with the hadoku parent site for theming and deployment.

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

