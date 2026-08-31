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
      <h2 className="mt-2 text-lg">That request did not complete.</h2>
      <p className="mt-2 font-mono text-xs text-ink-mid">{message}</p>
      {pokenode && (
        <p className="mt-1 truncate font-mono text-xs text-ink-lo" title={pokenode.url}>
          {pokenode.url}
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn mt-5 px-3 py-1.5 text-sm text-ink-hi"
        >
          Try again
        </button>
      )}
    </div>
  )
}
