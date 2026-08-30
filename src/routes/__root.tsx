import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
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
        <h2 className="mt-2 text-lg">No such page.</h2>
      </div>
    </Shell>
  ),
})

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">{children}</main>
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
