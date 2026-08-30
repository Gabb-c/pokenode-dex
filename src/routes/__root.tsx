import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { CommandPalette } from '@/components/chrome/CommandPalette'
import { StatusRail } from '@/components/chrome/StatusRail'
import { TopBar } from '@/components/chrome/TopBar'
import { ErrorState } from '@/components/ui/ErrorState'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  errorComponent: ({ error, reset }) => (
    <Shell>
      <ErrorState error={error} onRetry={reset} />
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <div className="panel mx-auto my-16 max-w-xl p-6">
        <p className="text-micro uppercase text-ink-lo">404</p>
        <h2 className="mt-2 text-lg">This app has no page at that address.</h2>
        <Link to="/pokemon" className="mt-5 inline-block text-sm text-accent">
          Back to the dex
        </Link>
      </div>
    </Shell>
  ),
})

/**
 * `main` is the only scroll container. The bar and the rail are pinned by being
 * its flex siblings rather than by `sticky`, so nothing has to know how tall
 * they are — they wrap to two lines on a phone and the dex still fits between.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <TopBar />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-350 flex-col px-4 py-6">
          {children}
        </div>
      </main>
      <CommandPalette />
      <StatusRail />
    </div>
  )
}

function RootLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  )
}
