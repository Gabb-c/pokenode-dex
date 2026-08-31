import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { queryClient } from './api/query-client'
import { paintBrowserChrome } from './lib/theme'
import { routeTree } from './routeTree.gen'
import './index.css'

// The inline script in index.html settles the class before first paint, but the
// tokens it picks are only computable once the stylesheet above has loaded.
paintBrowserChrome()

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // `main` is the only scroll container (see `__root.tsx`), so the window
  // scroll the router resets by default is always already at zero. Without
  // this, a card tapped from deep in the dex grid opens its detail page at
  // that offset — clamped to the bottom of a shorter page.
  scrollToTopSelectors: ['main'],
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
