'use client'

import { AlertCircle } from 'lucide-react'

interface InlineErrorProps {
  message: string
}

/**
 * Inline error alert. Use inside cards, panels, or sections.
 */
export function InlineError({ message }: InlineErrorProps) {
  return (
    <div className="border border-border bg-muted/40 text-muted-foreground p-3 rounded-xl flex items-center gap-2 text-xs">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
      {message}
    </div>
  )
}
