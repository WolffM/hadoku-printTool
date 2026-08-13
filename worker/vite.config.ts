import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    // Same reason as the root config: public/ is dev-harness only, and this
    // build writes into the same dist/ (emptyOutDir: false), so without the
    // guard it re-copies the favicon the root build deliberately skipped.
    copyPublicDir: false,
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
