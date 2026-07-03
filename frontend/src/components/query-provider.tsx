'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Wraps the app in a TanStack Query client. Created once per mount via useState
 * so the client is stable across re-renders.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5000
          }
        }
      })
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
