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
    // that render pay for jsdom and the Testing Library setup. The line between
    // them is one directory: `src/hooks` is React-bound by definition, and
    // everything else is node until it renders.
    projects: [
      {
        resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
        test: {
          name: 'unit',
          environment: 'node',
          // Everything but the hooks, rather than an enumerated set: a file
          // outside a listed directory would be collected by neither project
          // and pass by never running.
          include: ['src/**/*.test.ts'],
          exclude: ['src/hooks/**'],
        },
      },
      {
        resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx', 'src/hooks/**/*.test.ts'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
})
