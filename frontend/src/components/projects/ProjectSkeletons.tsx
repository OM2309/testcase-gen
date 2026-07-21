'use client'

import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface ProjectSkeletonsProps {
  viewMode: 'grid' | 'list'
}

/**
 * Loading skeleton component for project list and grid views.
 */
export function ProjectSkeletons({ viewMode }: ProjectSkeletonsProps) {
  if (viewMode === 'list') {
    return (
      <div className="flex flex-col gap-2.5 animate-pulse">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="border border-border bg-card rounded-xl p-3.5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5 flex-1 max-w-[280px]">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="border border-border bg-card rounded-xl p-4 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
