declare module 'pica' {
  interface PicaResizeOptions {
    quality?: number
    alpha?: boolean
    unsharpAmount?: number
    unsharpRadius?: number
    unsharpThreshold?: number
    cancelToken?: Promise<unknown>
    filter?: 'box' | 'hamming' | 'lanczos2' | 'lanczos3' | 'mks2013'
  }

  interface PicaOptions {
    tile?: number
    features?: string[]
    idle?: number
    concurrency?: number
  }

  class Pica {
    constructor(options?: PicaOptions)
    resize(
      from: HTMLCanvasElement | HTMLImageElement,
      to: HTMLCanvasElement,
      options?: PicaResizeOptions
    ): Promise<HTMLCanvasElement>
    toBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob>
    resizeBuffer(options: {
      src: Uint8Array
      width: number
      height: number
      toWidth: number
      toHeight: number
      quality?: number
      alpha?: boolean
      unsharpAmount?: number
      unsharpRadius?: number
      unsharpThreshold?: number
    }): Promise<Uint8Array>
  }

  export default Pica
}
