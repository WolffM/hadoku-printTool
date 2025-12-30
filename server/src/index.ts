/**
 * PrintTool Local Processing Server
 *
 * Runs on your local machine and receives requests via Cloudflare Tunnel.
 * Processes images using ImageMagick and returns the results.
 *
 * Usage:
 *   pnpm dev    # Start with hot reload
 *   pnpm start  # Start in production mode
 *
 * Requires:
 *   - ImageMagick installed on the system
 *   - Cloudflare Tunnel running (cloudflared)
 */

import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { checkImageMagick, generateCalibrationSheet, exportImage } from './imagemagick.js'

const app = new Hono().basePath('/printtool/api')

// CORS middleware
app.use('*', cors())

// Health check
app.get('/health', async c => {
  const hasImageMagick = await checkImageMagick()
  return c.json({
    success: true,
    data: {
      status: hasImageMagick ? 'healthy' : 'degraded',
      service: 'printtool-local',
      timestamp: new Date().toISOString(),
      imagemagick: hasImageMagick,
      ...(hasImageMagick ? {} : { warning: 'ImageMagick not found in PATH' })
    }
  })
})

// Calibration endpoint
app.post('/calibration', async c => {
  try {
    const body = await c.req.json()

    // Validate request
    if (!body.image) {
      return c.json({ success: false, error: 'Missing image data' }, 400)
    }

    if (!body.variations || !Array.isArray(body.variations) || body.variations.length === 0) {
      return c.json({ success: false, error: 'Missing or empty variations array' }, 400)
    }

    // Parse base64 image
    let imageData: Buffer
    try {
      // Remove data URL prefix if present
      const base64Data = body.image.replace(/^data:image\/\w+;base64,/, '')
      imageData = Buffer.from(base64Data, 'base64')
    } catch {
      return c.json({ success: false, error: 'Invalid base64 image data' }, 400)
    }

    // Generate calibration sheet
    const result = await generateCalibrationSheet({
      imageData,
      paperSize: body.paperSize || 'Letter',
      grid: body.grid || [2, 4],
      dpi: body.dpi || 600,
      variations: body.variations
    })

    return c.json({
      success: true,
      data: {
        image: `data:image/tiff;base64,${result.data.toString('base64')}`,
        filename: result.filename,
        gridSize: body.grid || [2, 4],
        variationCount: body.variations.length
      }
    })
  } catch (err) {
    console.error('Calibration error:', err)
    return c.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      },
      500
    )
  }
})

// Export endpoint
app.post('/export', async c => {
  try {
    const body = await c.req.json()

    // Validate request
    if (!body.image) {
      return c.json({ success: false, error: 'Missing image data' }, 400)
    }

    // Parse base64 image
    let imageData: Buffer
    try {
      // Remove data URL prefix if present
      const base64Data = body.image.replace(/^data:image\/\w+;base64,/, '')
      imageData = Buffer.from(base64Data, 'base64')
    } catch {
      return c.json({ success: false, error: 'Invalid base64 image data' }, 400)
    }

    // Export image
    const format = body.format || 'tiff'
    const dpi = body.dpi || 300
    const result = await exportImage({
      imageData,
      format,
      dpi,
      colorProfile: body.colorProfile,
      args: body.args
    })

    // Determine MIME type
    const mimeTypes: Record<string, string> = {
      tiff: 'image/tiff',
      png: 'image/png',
      jpeg: 'image/jpeg'
    }

    return c.json({
      success: true,
      data: {
        image: `data:${mimeTypes[format]};base64,${result.data.toString('base64')}`,
        filename: result.filename,
        format,
        dpi,
        sizeBytes: result.data.length
      }
    })
  } catch (err) {
    console.error('Export error:', err)
    return c.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      },
      500
    )
  }
})

// 404 handler
app.notFound(c => {
  return c.json({ success: false, error: 'Route not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ success: false, error: 'Internal server error' }, 500)
})

// Start server
const port = 8787

async function main() {
  // Check ImageMagick availability
  const hasImageMagick = await checkImageMagick()
  if (!hasImageMagick) {
    console.warn('ImageMagick not found in PATH!')
    console.warn('Please install ImageMagick: https://imagemagick.org/script/download.php')
    console.warn('Server will start but processing endpoints will fail.\n')
  } else {
    console.log('ImageMagick detected')
  }

  console.log(`PrintTool Local Server starting on port ${port}`)
  console.log(`Endpoints:`)
  console.log(`  GET  /printtool/api/health`)
  console.log(`  POST /printtool/api/calibration`)
  console.log(`  POST /printtool/api/export`)
  console.log('')
  console.log('Ensure Cloudflare Tunnel is running to receive requests from hadoku.me')

  serve({
    fetch: app.fetch,
    port
  })
}

main().catch(console.error)
