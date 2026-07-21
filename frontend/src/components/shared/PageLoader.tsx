'use client'

import { Loader2 } from 'lucide-react'

interface PageLoaderProps {
  message?: string
}

/**
 * Full-page loading spinner. Use when an entire page/view is waiting for data.
 */
export function PageLoader({ message = 'Loading…' }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
