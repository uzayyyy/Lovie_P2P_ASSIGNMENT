import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_'],
  resolve: {
    alias: {
      src: resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
