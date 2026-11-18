import type { ReactNode } from 'react'

type Variant = 'error' | 'warning' | 'info'

const STYLES: Record<Variant, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
}

interface Props {
  message: ReactNode
  title?: string
  variant?: Variant
  onDismiss?: () => void
  onRetry?: () => void
}

export function ErrorBanner({ message, title, variant = 'error', onDismiss, onRetry }: Props) {
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${STYLES[variant]}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {title && <p className="font-semibold">{title}</p>}
          <div className={title ? 'mt-0.5' : ''}>{message}</div>
        </div>
        {onRetry && (
          <button type="button" onClick={onRetry} className="shrink-0 font-medium underline underline-offset-2">
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded px-1 leading-none opacity-60 hover:opacity-100"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
