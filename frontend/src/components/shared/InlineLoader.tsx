'use client'

import { Loader2 } from 'lucide-react'

interface InlineLoaderProps {
  message?: string
}

/**
 * Inline/section-level loading spinner. Use inside cards, panels, or sections.
 */
export function InlineLoader({ message }: InlineLoaderProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      {message && <span className="text-xs">{message}</span>}
    </div>
  )
}
