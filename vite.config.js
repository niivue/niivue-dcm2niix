import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: './',
  server: {
    open: 'index.html',
  },
  optimizeDeps: {
    exclude: ['@niivue/dcm2niix']
  },
  worker: {
    format: 'es'
  }
})