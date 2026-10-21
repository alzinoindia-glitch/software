import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  input: {
    storefront: resolve(import.meta.dirname, 'index.html'),
    erp: resolve(import.meta.dirname, 'admin.html'),
  },
  plugins: [react()],
  base: '/',
})
