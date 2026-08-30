import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Deliberately not the app's vite config: the route generator and the React
// compiler have no part in a unit run.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
