/** A placeholder holding the space its section will take, to avoid a layout jump. */
export function Skeleton({ label, lines = 3 }: { label: string; lines?: number }) {
  return (
    <section className="panel p-4" aria-busy="true" aria-live="polite">
      <h2 className="text-micro uppercase text-ink-lo">{label}</h2>
      <div className="mt-3 flex flex-col gap-2">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className="h-3 rounded-full bg-surface-2 motion-safe:animate-pulse"
            style={{ width: `${90 - index * 15}%` }}
          />
        ))}
      </div>
      <span className="sr-only">Loading {label}</span>
    </section>
  )
}
