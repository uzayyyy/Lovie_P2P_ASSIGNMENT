import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_'],
  resolve: {
    alias: [
      { find: 'src', replacement: resolve(__dirname, './src') },
      // Redirect CJS @mui/icons-material/Icon paths to their ESM equivalents
      // to avoid Vite's __toESM isNodeMode=1 interop issue that yields an
      // object instead of a function as the default export.
      {
        find: /^@mui\/icons-material\/(?!esm\/)(.+)$/,
        replacement: resolve(__dirname, 'node_modules/@mui/icons-material/esm/$1'),
      },
    ],
  },
  optimizeDeps: {
    include: ['@mui/icons-material'],
  },
  server: {
    port: 5173,
  },
})
