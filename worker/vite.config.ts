import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'worker.js'
    },
    outDir: resolve(__dirname, '../dist'),
    emptyOutDir: false,
    target: 'es2022',
    minify: false
  }
})
