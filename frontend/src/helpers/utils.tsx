import React from 'react'

/**
 * Returns a styled JSX badge based on the test case priority (case-insensitive).
 * Uses oklch theme variables defined in globals.css.
 */
export const getPriorityBadge = (priority: string) => {
  const colors = {
    high: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    critical: 'bg-red-600/10 text-red-500 border-red-500/20'
  }
  const key = (priority || '').toLowerCase()
  const cls = colors[key as keyof typeof colors] || 'bg-muted text-muted-foreground border-border'
  return (
    <span className={`px-1.5 py-0.5 text-[10px] rounded border uppercase font-bold ${cls}`}>
      {priority}
    </span>
  )
}
