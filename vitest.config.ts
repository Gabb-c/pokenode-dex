import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Deliberately not the app's vite config: the route generator and the React
// compiler have no part in a unit run.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Two projects so the pure api/lib tests stay on node, and only the ones
    // that render pay for jsdom and the Testing Library setup.
    projects: [
      {
        resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/lib/dex-search.test.ts'],
        },
      },
      {
        resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx', 'src/lib/dex-search.test.ts'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
})
