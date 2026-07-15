'use client'

import React from 'react'
import {
  CheckCircle2, XCircle, Loader2, Clock, MinusCircle
} from 'lucide-react'

type AnyStatus =
  | 'queued' | 'running' | 'completed' | 'failed'
  | 'pending' | 'passed' | 'skipped'

interface StatusStyle {
  label: string
  className: string
  icon: React.ReactNode
}

/**
 * Central status → colour/icon mapping shared across execution components.
 * Uses the same oklch theme tokens + emerald/rose/amber/blue accents used
 * elsewhere in the app.
 */
export function getStatusStyle(status: AnyStatus, spin = true): StatusStyle {
  switch (status) {
    case 'passed':
    case 'completed':
      return {
        label: status === 'passed' ? 'Passed' : 'Completed',
        className: 'bg-primary/10 text-primary border-primary/20',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
      }
    case 'failed':
      return {
        label: 'Failed',
        className: 'bg-error/10 text-error border-error/20',
        icon: <XCircle className="w-3.5 h-3.5 text-error" />
      }
    case 'running':
      return {
        label: 'Running',
        className: 'bg-primary/10 text-primary border-primary/20',
        icon: <Loader2 className={`w-3.5 h-3.5 text-primary ${spin ? 'animate-spin' : ''}`} />
      }
    case 'queued':
      return {
        label: 'Queued',
        className: 'bg-muted text-muted-foreground border-border',
        icon: <Clock className="w-3.5 h-3.5 text-muted-foreground" />
      }
    case 'skipped':
      return {
        label: 'Skipped',
        className: 'bg-muted text-muted-foreground border-border',
        icon: <MinusCircle className="w-3.5 h-3.5 text-muted-foreground" />
      }
    case 'pending':
    default:
      return {
        label: 'Pending',
        className: 'bg-muted text-muted-foreground border-border',
        icon: <Clock className="w-3.5 h-3.5 text-muted-foreground" />
      }
  }
}

export function ExecutionStatusBadge({
  status,
  size = 'sm'
}: {
  status: AnyStatus
  size?: 'sm' | 'md'
}) {
  const style = getStatusStyle(status)
  const pad = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wide ${pad} ${style.className}`}>
      {style.icon}
      {style.label}
    </span>
  )
}
