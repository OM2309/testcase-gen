import React from 'react'

/**
 * Returns a styled JSX badge based on the test case priority (case-insensitive).
 * Uses oklch theme variables defined in globals.css.
 */
export const getPriorityBadge = (priority: string) => {
  const colors = {
    high: 'bg-primary/10 text-primary border-primary/20',
    medium: 'bg-primary/10 text-primary border-primary/20',
    low: 'bg-muted text-muted-foreground border-border',
    critical: 'bg-primary/10 text-primary border-primary/20'
  }
  const key = (priority || '').toLowerCase()
  const cls = colors[key as keyof typeof colors] || 'bg-muted text-muted-foreground border-border'
  return (
    <span className={`px-1.5 py-0.5 text-[10px] rounded border uppercase font-bold ${cls}`}>
      {priority}
    </span>
  )
}
