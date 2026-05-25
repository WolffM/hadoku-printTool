/**
 * Canvas + Pica mocks for happy-dom test environment.
 *
 * happy-dom returns null for `canvas.getContext('2d')`. These mocks install a
 * recording context stub plus a no-op pica that just sets the target size.
 *
 * Used by canvas-output tests in `src/domain/processing/**\/*.test.ts` to
 * verify structural output (canvas dimensions, draw counts) without needing
 * a real browser. Pixel-level tests would need vitest-browser; out of scope.
 */

import { vi } from 'vitest'

export interface DrawCall {
  op: 'drawImage' | 'fillRect'
  /** [x, y] for both ops */
  pos: [number, number]
  /** [w, h] for fillRect; [w, h] for drawImage when supplied */
  size?: [number, number]
  /** dimensions of the source canvas when op === 'drawImage' */
  source?: { width: number; height: number }
}

export interface RecordingContext {
  fillStyle: string
  calls: DrawCall[]
  fillRect: (x: number, y: number, w: number, h: number) => void
  drawImage: (img: HTMLCanvasElement | HTMLImageElement, x: number, y: number) => void
  translate: (x: number, y: number) => void
  rotate: (rad: number) => void
}

function makeRecordingContext(): RecordingContext {
  const calls: DrawCall[] = []
  const noop = () => {
    /* recording mock — translate/rotate aren't observed */
  }
  return {
    fillStyle: '',
    calls,
    fillRect(x, y, w, h) {
      calls.push({ op: 'fillRect', pos: [x, y], size: [w, h] })
    },
    drawImage(img, x, y) {
      calls.push({
        op: 'drawImage',
        pos: [x, y],
        source: { width: img.width, height: img.height }
      })
    },
    translate: noop,
    rotate: noop
  }
}

/**
 * Patch `HTMLCanvasElement.prototype.getContext` to return a recording stub.
 * Call inside `beforeAll` or top-level of a test file. Returns a function
 * mapping a canvas → its recording context (or null if never queried).
 */
export function installCanvasMock(): {
  contextFor: (canvas: HTMLCanvasElement) => RecordingContext | null
  restore: () => void
} {
  const map = new WeakMap<HTMLCanvasElement, RecordingContext>()
  // eslint-disable-next-line @typescript-eslint/unbound-method -- we restore by re-assigning the prototype slot
  const original = HTMLCanvasElement.prototype.getContext

  // The real signature returns CanvasRenderingContext2D, but our recording
  // stub is structurally compatible with the subset of methods we call.
  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    kind: string
  ) {
    if (kind !== '2d') return null
    let ctx = map.get(this)
    if (!ctx) {
      ctx = makeRecordingContext()
      map.set(this, ctx)
    }
    return ctx as unknown as CanvasRenderingContext2D
  } as typeof HTMLCanvasElement.prototype.getContext

  return {
    contextFor: c => map.get(c) ?? null,
    restore: () => {
      HTMLCanvasElement.prototype.getContext = original
    }
  }
}

/**
 * Mock the `pica` module to a no-op resize that just sets target dimensions.
 * Call at top of a test file (vi.mock is hoisted).
 *
 * Usage in a test file:
 *   vi.mock('pica', () => ({ default: pica }))  // import { picaMock as pica } from ...
 */
export const picaMock = vi.fn(() => ({
  resize: vi.fn((_src: HTMLCanvasElement, target: HTMLCanvasElement) => {
    // Pica writes pixels into target.width × target.height; we just trust the
    // dimensions are already set by the caller. No async work in the mock.
    return Promise.resolve(target)
  })
}))
