import { PokenodeError } from 'pokenode-ts'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
}

/**
 * Reports what the client reported.
 *
 * `PokenodeError` carries the status, the status text and the URL that produced
 * it, so a failure here says which request failed and why rather than "something
 * went wrong".
 */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const pokenode = PokenodeError.isPokenodeError(error) ? error : undefined
  const message = error instanceof Error ? error.message : String(error)

  return (
    <div className="panel mx-auto my-16 max-w-xl p-6">
      <p className="text-micro uppercase text-negative">
        {pokenode ? `${pokenode.status} ${pokenode.statusText}` : 'Request failed'}
      </p>
      <h2 className="mt-2 text-lg">{message}</h2>
      {pokenode && (
        <p className="mt-3 truncate font-mono text-xs text-ink-lo" title={pokenode.url}>
          {pokenode.url}
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-[4px] border border-line px-3 py-1.5 text-sm text-ink-hi hover:border-line-strong"
        >
          Try again
        </button>
      )}
    </div>
  )
}
