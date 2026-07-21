'use client'

import { AlertTriangle } from 'lucide-react'

interface PageErrorProps {
  message?: string
  onRetry?: () => void
}

/**
 * Full-page error display. Use when an entire page/view fails to load.
 */
export function PageError({
  message = 'Something went wrong. Please try again.',
  onRetry
}: PageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground gap-3">
      <AlertTriangle className="w-8 h-8 text-primary" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          Retry
        </button>
      )}
    </div>
  )
}
